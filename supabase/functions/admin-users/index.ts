// Login management for the owner and developer logins (Users screen).
// Sends invite emails (the person sets their own password), creates logins
// with a password the admin chooses, sets new passwords and removes logins. Runs on Supabase with the service role key, which never
// reaches the website. Deploy: supabase functions deploy admin-users
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const MIN_PASSWORD = 8;
// Where the invite and reset links land.
const SITE = 'https://portal.peglobal.in';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Use POST' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });

  // Only the owner and developer logins (same rule as the database).
  const { data: me } = await caller.auth.getUser();
  const { data: isAdmin, error: adminError } = await caller.rpc('is_admin');
  if (!me?.user || adminError || isAdmin !== true) {
    return reply(403, { error: 'Only the owner or developer login can manage logins.' });
  }
  const myEmail = (me.user.email || '').toLowerCase();

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  let body: { action?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: 'Bad request' });
  }
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  const allUsers = async () => {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    return data.users;
  };
  const findUser = async () => (await allUsers()).find(u => (u.email || '').toLowerCase() === email);
  const hasAccess = async () => {
    const [{ data: staff }, { data: cust }] = await Promise.all([
      admin.from('staff_emails').select('email').eq('email', email).maybeSingle(),
      admin.from('customers').select('id').contains('authorized_emails', [email]).limit(1),
    ]);
    return !!staff || !!(cust && cust.length);
  };

  try {
    switch (body.action) {
      case 'list': {
        const users = await allUsers();
        return reply(200, {
          users: users.map(u => ({
            email: (u.email || '').toLowerCase(),
            lastSignInAt: u.last_sign_in_at ?? null,
            createdAt: u.created_at,
          })),
        });
      }

      case 'invite': {
        // The person gets an email and chooses their own password; nobody else knows it.
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, { error: 'Enter a valid email address.' });
        if (!(await hasAccess())) {
          return reply(400, { error: 'Add this email to a customer or as a factory login first.' });
        }
        const redirectTo = SITE;
        if (await findUser()) {
          // Already has a login: send a "set your password" (reset) email instead.
          const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
          if (error) throw error;
          return reply(200, { ok: true, sent: 'reset' });
        }
        const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
        if (error) throw error;
        return reply(200, { ok: true, sent: 'invite' });
      }

      case 'create': {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, { error: 'Enter a valid email address.' });
        if (password.length < MIN_PASSWORD) {
          return reply(400, { error: `The password must be at least ${MIN_PASSWORD} characters.` });
        }
        // A login only for an email the factory has already given access to.
        if (!(await hasAccess())) {
          return reply(400, { error: 'Add this email to a customer or as a factory login first.' });
        }
        if (await findUser()) {
          return reply(409, { error: 'A login with this email already exists. Use "Set password" instead.' });
        }
        const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        if (error) throw error;
        return reply(200, { ok: true });
      }

      case 'set_password': {
        if (password.length < MIN_PASSWORD) {
          return reply(400, { error: `The password must be at least ${MIN_PASSWORD} characters.` });
        }
        const user = await findUser();
        if (!user) return reply(404, { error: 'There is no login for this email yet.' });
        const { error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
        if (error) throw error;
        return reply(200, { ok: true });
      }

      case 'delete': {
        if (email === myEmail) return reply(400, { error: 'You cannot delete your own login.' });
        const user = await findUser();
        if (!user) return reply(200, { ok: true });
        const { error } = await admin.auth.admin.deleteUser(user.id);
        if (error) throw error;
        return reply(200, { ok: true });
      }

      default:
        return reply(400, { error: 'Unknown action' });
    }
  } catch (e) {
    return reply(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
