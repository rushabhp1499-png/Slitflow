# Connecting SlitFlow to its database (Supabase)

SlitFlow now saves every order, bundle, challan and customer in one online
database (Supabase). The factory and every customer see the same data, and
changes appear on other screens within a second or two.

Follow these steps once. They take about 15 minutes.

---

## 1. Create the Supabase project

1. Go to <https://supabase.com> and sign up (the free plan is enough to start).
2. Click **New project**.
   - Name: `slitflow`
   - Database password: choose a strong one and keep it safe (you rarely need it).
   - Region: **Mumbai (ap-south-1)** - closest to Bhiwandi.
3. Wait about 2 minutes for it to finish setting up.

## 2. Create the tables and security rules

1. In the project, open **SQL Editor** (left menu) and click **New query**.
2. Open the file [`supabase/schema.sql`](supabase/schema.sql) from this project, copy everything, and paste it in.
3. Click **Run**. You should see "Success. No rows returned".

This creates the tables, the job-number counter, and the rules that make sure
**a customer can only ever see their own company's orders**.

## 3. Sign-in settings

Open **Authentication -> Sign In / Providers -> Email**:

- Keep **Confirm email** switched **ON**. This is important: it proves people
  own the email they register with, so nobody can pretend to be one of your
  customers.

Open **Authentication -> URL Configuration**:

- **Site URL**: your live website address, e.g. `https://yourdomain.com`
- **Redirect URLs**: add `https://yourdomain.com` and `http://localhost:3000`

## 4. Send sign-in emails from your own Gmail (recommended)

Supabase's built-in email sender only allows a few emails per hour, which is
not enough once customers start registering. Send them from
`progressive.ent8@gmail.com` instead:

1. Turn on 2-Step Verification on the Gmail account, then create an
   **App password** at <https://myaccount.google.com/apppasswords>.
2. In Supabase open **Authentication -> Emails -> SMTP Settings**, enable custom SMTP:
   - Host `smtp.gmail.com`, Port `465`
   - Username `progressive.ent8@gmail.com`
   - Password: the 16-letter app password
   - Sender name `Progressive Enterprises`

## 5. Create the factory login

1. Open **Authentication -> Users -> Add user -> Create new user**.
2. Email `progressive.ent8@gmail.com`, choose a **new, strong password**
   (do not reuse the old `Progressive@123`, it was visible in the old site's code),
   and tick **Auto Confirm User**.

That email is already on the factory staff list (`staff_emails` table), so it
opens the factory dashboard. To give another staff member access, create a
user for them the same way and run this in the SQL Editor:

```sql
insert into public.staff_emails (email) values ('their.email@example.com');
```

## 6. Connect the website to the project

1. In Supabase open **Project Settings -> API** (or **Data API**) and copy:
   - **Project URL**
   - **anon / public** key (this key is meant to be public; the security rules protect the data)
2. In the project folder, create a file named `.env` containing:

```
VITE_SUPABASE_URL="https://xxxxxxxx.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
```

Never put the **service_role** key in this file or anywhere in the website.

## 7. Try it on your computer

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:3000>, sign in on the **Factory Dashboard** tab, and add
an order. Then register a test customer in another browser (or a private
window) and check that the customer sees only their own orders, and that
changes made by the factory show up for them without refreshing.

## 8. Put it live on Hostinger

The `.env` values are built into the site when you run `npm run build`, so the
build must happen where those values are available:

- **If Hostinger builds the site from GitHub:** add `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` as environment variables in Hostinger's deployment
  settings.
- **If you upload files yourself:** run `npm run build` on your computer and upload
  the contents of the `dist` folder (including `.htaccess`) to `public_html`.

## Moving old data across

The old version stored everything only inside each browser. The first time
you sign in to the factory dashboard **in the same browser you used before, on
the live website address**, a blue banner offers to import those records into
the database. Sample/demo records are skipped automatically.

Customer accounts from the old version are **not** copied with their passwords
(those were stored insecurely). Customers simply click **Create New Account**
again with the same email, or the factory adds their email to the company
under *Manage Customers* and they register with that email.

## How access works

| Who | How they get in | What they see |
|---|---|---|
| Factory staff | Email listed in `staff_emails` | Everything |
| New customer | Registers on the login page, confirms email | A new company is created for them; only their orders |
| Colleague of an existing customer | Factory adds their email to the company in *Manage Customers*; they register with that email | That company's orders |

Removing an email from a company in *Manage Customers* removes that person's access.
