import React, { useEffect, useState } from 'react';
import { useProduction, LoginInfo } from '../context/ProductionContext';
import { getSupabase, errorMessage } from '../lib/supabase';
import { X, KeyRound, Trash2, UserPlus, Download, Upload } from 'lucide-react';

interface UsersModalProps {
  onClose: () => void;
}

interface StaffRow {
  email: string;
  staff_role: 'manager' | 'owner' | 'developer';
  display_name: string | null;
}

const ROLES = [
  { value: 'manager', label: 'Production Manager' },
  { value: 'owner', label: 'Top Management (full control)' },
  { value: 'developer', label: 'Developer (full control)' },
];

// Owner/developer only: factory logins and customer logins in one place.
export const UsersModal: React.FC<UsersModalProps> = ({ onClose }) => {
  const { customers, addAuthorizedEmail, removeAuthorizedEmail, manageLogins } = useProduction();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [logins, setLogins] = useState<LoginInfo[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'manager', password: '' });
  const [newClient, setNewClient] = useState({ customerId: '', email: '', password: '' });

  const load = async () => {
    const [{ data, error }, list] = await Promise.all([
      getSupabase().from('staff_emails').select('email, staff_role, display_name').order('email'),
      manageLogins('list'),
    ]);
    if (error) setMessage(errorMessage(error));
    setStaff((data || []) as StaffRow[]);
    if (list.success) setLogins(list.users || []);
    else setMessage(list.message);
  };
  useEffect(() => {
    void load();
  }, []);

  const loginFor = (email: string) => logins.find(l => l.email === email.toLowerCase());

  const run = async (work: () => Promise<string | null>, done: string) => {
    setBusy(true);
    setMessage('');
    try {
      const err = await work();
      setMessage(err || done);
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
      void load();
    }
  };

  const askPassword = (email: string) => {
    const pw = window.prompt(`New password for ${email} (at least 8 characters):`);
    if (!pw) return;
    void run(async () => {
      const r = await manageLogins(loginFor(email) ? 'set_password' : 'create', email, pw);
      return r.success ? null : r.message;
    }, `Password saved for ${email}. Share it with them privately.`);
  };

  // Emails the person a link to choose their own password (works for new and existing logins).
  const sendInvite = (email: string) =>
    run(async () => {
      const r = await manageLogins('invite', email);
      return r.success ? null : r.message;
    }, `Email sent to ${email}. They click the link and choose their own password.`);

  const addStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const email = newStaff.email.trim().toLowerCase();
    const pw = newStaff.password;
    void run(async () => {
      const { error } = await getSupabase()
        .from('staff_emails')
        .insert({ email, staff_role: newStaff.role, display_name: newStaff.name.trim() || null });
      if (error) return errorMessage(error);
      if (!loginFor(email)) {
        const r = pw ? await manageLogins('create', email, pw) : await manageLogins('invite', email);
        if (!r.success) return `Added, but the login was not created: ${r.message}`;
      }
      setNewStaff({ name: '', email: '', role: 'manager', password: '' });
      return null;
    }, pw ? `Factory login ready for ${email}.` : `Invite sent to ${email}. They choose their own password.`);
  };

  const changeRole = (email: string, role: string) =>
    run(async () => {
      const { error } = await getSupabase().from('staff_emails').update({ staff_role: role }).eq('email', email);
      return error ? errorMessage(error) : null;
    }, `Role changed for ${email}.`);

  const removeStaff = (email: string) => {
    if (!window.confirm(`Remove factory access for ${email}? Their login is deleted.`)) return;
    void run(async () => {
      const { error } = await getSupabase().from('staff_emails').delete().eq('email', email);
      if (error) return errorMessage(error);
      const r = await manageLogins('delete', email);
      return r.success ? null : r.message;
    }, `${email} removed.`);
  };

  const addClient = (e: React.FormEvent) => {
    e.preventDefault();
    const email = newClient.email.trim().toLowerCase();
    if (!newClient.customerId) return setMessage('Choose the customer first.');
    addAuthorizedEmail(newClient.customerId, email);
    void run(async () => {
      // Wait for the email to reach the database before sending the invite.
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500));
        const r = await manageLogins('invite', email);
        if (r.success) {
          setNewClient({ customerId: '', email: '', password: '' });
          return null;
        }
        if (!/first/.test(r.message)) return r.message;
      }
      return 'The email was added, but the invite could not be sent yet. Click "Send invite" in a moment.';
    }, `Invite sent to ${email}. They click the link in the email and choose their own password.`);
  };

  const removeClient = (customerId: string, email: string) => {
    if (!window.confirm(`Remove ${email}'s access to this customer? Their login is deleted.`)) return;
    removeAuthorizedEmail(customerId, email);
    void run(async () => {
      const r = await manageLogins('delete', email);
      return r.success ? null : r.message;
    }, `${email} removed.`);
  };

  const backupNow = () =>
    run(async () => {
      const { downloadFullBackup } = await import('../utils/backup');
      return downloadFullBackup(); // shown as the message
    }, '');

  const restoreFrom = (file: File) =>
    run(async () => {
      const { checkRestore, writeRestore } = await import('../utils/backup');
      const { backup, missing, changed } = await checkRestore(file);
      if (!missing.length && !changed.length) return `Nothing to restore: the portal already matches this backup (${backup.length} records).`;
      const addOk =
        missing.length > 0 &&
        window.confirm(`${missing.length} record(s) in the backup are missing from the portal (deleted or lost).\n\nAdd them back?`);
      const replaceOk =
        changed.length > 0 &&
        window.confirm(
          `${changed.length} record(s) are different in the portal now than in the backup.\n\n` +
            'Replace them with the backup copy? Any changes made after the backup was taken will be LOST.\n\n' +
            'Click Cancel to keep the portal versions (safe).'
        );
      if (!addOk && !replaceOk) return 'Restore cancelled. Nothing was changed.';
      const problems = await writeRestore(addOk ? missing : [], replaceOk ? changed : []);
      if (problems.length) return `Restore finished with ${problems.length} problem(s): ${problems.slice(0, 3).join(' | ')}`;
      window.setTimeout(() => window.location.reload(), 1500);
      return `Restored: ${addOk ? missing.length : 0} added back, ${replaceOk ? changed.length : 0} replaced. Reloading…`;
    }, '');

  const input = 'px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm';
  const loginBadge = (email: string) => {
    const l = loginFor(email);
    return l ? (
      <span className="text-[11px] text-emerald-700">
        Login active{l.lastSignInAt ? ` • last in ${new Date(l.lastSignInAt).toLocaleDateString()}` : ' • never signed in'}
      </span>
    ) : (
      <span className="text-[11px] text-amber-700">No login yet</span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 my-6">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Users & Logins
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 text-sm">
          {message && <p className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg p-2">{message}</p>}

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Factory logins</h3>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
              {staff.map(s => (
                <div key={s.email} className="p-3 flex flex-wrap items-center gap-2 justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold">{s.display_name || s.email}</div>
                    <div className="text-xs text-slate-500">{s.email}</div>
                    {loginBadge(s.email)}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <select value={s.staff_role} disabled={busy} onChange={e => void changeRole(s.email, e.target.value)} className={input}>
                      {ROLES.map(r => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <button disabled={busy} onClick={() => void sendInvite(s.email)} className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold">
                      {loginFor(s.email)?.lastSignInAt ? 'Email password link' : 'Send invite'}
                    </button>
                    <button disabled={busy} onClick={() => askPassword(s.email)} className="px-2 py-2 text-slate-500 underline text-[11px]">
                      Set password myself
                    </button>
                    <button disabled={busy} onClick={() => removeStaff(s.email)} className="p-2 text-red-700 border border-red-200 rounded-lg" title="Remove">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={addStaff} className="mt-3 grid grid-cols-1 sm:grid-cols-5 gap-2">
              <input required placeholder="Name" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} className={input} />
              <input required type="email" placeholder="Email" value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} className={input} />
              <select value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} className={input}>
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <input minLength={8} placeholder="Password (blank = email invite)" value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} className={input} />
              <button disabled={busy} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                <UserPlus className="w-4 h-4" /> Add
              </button>
            </form>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Customer logins</h3>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
              {customers.length === 0 && <p className="p-3 text-xs text-slate-500">No customers yet. Add them in Customer Master.</p>}
              {customers.map(c =>
                (c.authorizedEmails || []).map(email => (
                  <div key={c.id + email} className="p-3 flex flex-wrap items-center gap-2 justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold">{c.companyName}</div>
                      <div className="text-xs text-slate-500">{email}</div>
                      {loginBadge(email)}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <button disabled={busy} onClick={() => void sendInvite(email)} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">
                        {loginFor(email)?.lastSignInAt ? 'Email password link' : 'Send invite'}
                      </button>
                      <button disabled={busy} onClick={() => askPassword(email)} className="px-2 py-2 text-slate-500 underline text-[11px]">
                        Set password myself
                      </button>
                      <button disabled={busy} onClick={() => removeClient(c.id, email)} className="p-2 text-red-700 border border-red-200 rounded-lg" title="Remove access">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={addClient} className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select required value={newClient.customerId} onChange={e => setNewClient({ ...newClient, customerId: e.target.value })} className={input}>
                <option value="">Customer…</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
              <input required type="email" placeholder="Their email" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} className={input} />
              <button disabled={busy} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                <UserPlus className="w-4 h-4" /> Give access & send invite
              </button>
            </form>
            <p className="mt-1.5 text-[11px] text-slate-500">
              They get an email with a link and choose their own password. Nobody else sees it.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Backup</h3>
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} onClick={() => void backupNow()} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                <Download className="w-4 h-4" /> Download full backup (Excel)
              </button>
              <label className={`px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 ${busy ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50'}`}>
                <Upload className="w-4 h-4" /> Restore from backup…
                <input
                  type="file"
                  accept=".xlsx"
                  disabled={busy}
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) void restoreFrom(f);
                  }}
                />
              </label>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Every order, challan, customer, machine and staff record in one file. Take one every Saturday and save it in OneDrive.
              Restore asks before changing anything. Logins and passwords are not in the file; re-send invites if ever needed.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
