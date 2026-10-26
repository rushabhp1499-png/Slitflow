# Automatic WhatsApp updates – one-time setup

SlitFlow sends customers a WhatsApp message automatically when:

1. their material is received,
2. the delivery date is set or changed,
3. a challan is made (dispatch),
4. their change request is approved or declined.

The messages come from **your business number** through Meta's WhatsApp Cloud API.
Meta charges per message (order updates are "utility" messages, roughly ₹0.10–0.15
each in India – check Meta's current rate card). There is no monthly fee.

Until the setup below is finished, nothing is sent and orders save normally;
the Activity Log shows "not_configured".

---

## What you need

- A phone number for WhatsApp Business that is **not** registered on the normal
  WhatsApp / WhatsApp Business app (a new SIM or a landline works).
- Your GST certificate or other business documents for Meta's business verification.
- About 30 minutes, plus 1–3 days for Meta to verify the business and approve templates.

## Step 1 – Meta business account

1. Go to <https://business.facebook.com> and create a business portfolio for
   **Progressive Enterprises** (or use the one you have).
2. In **Business settings → Security centre**, start **Business verification** and upload
   the GST certificate.

## Step 2 – WhatsApp app

1. Go to <https://developers.facebook.com> → **My Apps → Create app** → type **Business**,
   linked to the Progressive Enterprises portfolio.
2. In the app, add the **WhatsApp** product.
3. Under **WhatsApp → API Setup**, click **Add phone number**, enter the business number and
   verify it with the code Meta sends.
4. Note the **Phone number ID** shown on that page (a long number). You will need it in Step 5.

## Step 3 – Permanent access token

1. **Business settings → Users → System users → Add** → name `slitflow`, role **Admin**.
2. **Assign assets**: add your WhatsApp app (full control) and your WhatsApp account.
3. **Generate token** → choose the app → expiry **Never** → permissions
   `whatsapp_business_messaging` and `whatsapp_business_management`.
4. Copy the token. Treat it like a password: don't paste it in chat or email.

## Step 4 – Message templates

In **WhatsApp Manager → Message templates → Create template**, create these four.
Category **Utility**, language **English**, names exactly as written.
The `{{1}}`, `{{2}}`… are filled in by SlitFlow.

**material_received**
> Dear {{1}}, we have received your material for PO {{2}}: {{3}} kg of {{4}}. We will keep you updated on its progress. – Progressive Enterprises

**delivery_date_set**
> Dear {{1}}, the expected delivery date for your PO {{2}} is {{3}}. – Progressive Enterprises

**material_dispatched**
> Dear {{1}}, material for PO {{2}} has been dispatched on challan {{3}}: {{4}} kg in {{5}} bundles, vehicle {{6}}. Balance with us: {{7}} kg. – Progressive Enterprises

**change_request_update**
> Dear {{1}}, your change request for PO {{2}} has been {{3}}. Note: {{4}} – Progressive Enterprises

Meta usually approves utility templates within minutes to a day.

## Step 5 – Connect SlitFlow

In Supabase → **SQL Editor** → **New query**, type the following, replacing the two
values with yours (the token from Step 3, the Phone number ID from Step 2), and **Run**:

```sql
select vault.create_secret('PASTE-THE-TOKEN-HERE', 'whatsapp_token');
select vault.create_secret('PASTE-THE-PHONE-NUMBER-ID-HERE', 'whatsapp_phone_number_id');
```

The values are stored encrypted in Supabase Vault. Only the database can read them.

## Step 6 – Test

In the SQL Editor, with your own mobile number:

```sql
select public.whatsapp_test('9326737273');
```

You should get Meta's "Hello World" message within a minute. If not, run

```sql
select id, status_code, content from net._http_response order by id desc limit 5;
```

and send the developer the `content` text (it never contains the token).

## Day to day

- Each customer's WhatsApp number is the **Contact Phone** in Customer Master.
  Untick **Send WhatsApp updates** there to stop messages to a customer.
- Every message sent (or skipped, and why) appears in the **Activity Log** under
  "WhatsApp messages".
- To change the token later: `select vault.update_secret((select id from vault.secrets where name = 'whatsapp_token'), 'NEW-TOKEN');`
