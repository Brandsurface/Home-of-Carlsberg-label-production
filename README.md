# Brandsurface — Can Artwork & Production

Order/brief flow for can artwork & production, with database, transactional
mail (with a grace-period delay), two languages and a flexible admin.

## Tech stack

- **Next.js 14** (App Router) — frontend + serverless API routes
- **Supabase** — PostgreSQL database (orders, brands, settings, admin users) + file storage
- **Resend** — transactional mail (customer confirmation + delayed, cancellable forwarding)
- **Vercel** — hosting

## What the customer fills in

One order = one **can brief**:

1. **Order details** — campaign/project, name, email, deadline, GDPR consent
2. **Brand selection** — brand (tiles) → variant (dropdown, cascades from the brand)
3. **Size & technical specs** — size, region (DK/Border), label type, cutterguide (+ attach), finish
4. **Production details** — material no. (old/new), EAN, *Pantmærke* (auto-hidden for `Border`), ingredients & nutrition (+ attach PDF)
5. **Artwork** — upload files, request artwork help, or request a Smash link

Pressing **Review order** opens a popup summarising everything; the customer
can always go back and edit before submitting.

## Mail-flow

```
Customer fills in the form
  ↓ POST /api/order
Order saved in Supabase (status: pending)
  ↓ Resend → customer confirmation (with Edit link)
  ↓ Resend → Brandsurface order email, SCHEDULED after N minutes (admin-configurable grace period)
  │
  ├── Edit link → /?edit=<id> → form re-loads with all data → resubmit (revision +1, timer resets)
  └── No action → after the delay the order auto-forwards to Brandsurface
```

The customer email also contains explicit Approve via the admin "Approve now"
action (`/api/admin/orders`) and `/api/confirm` / `/api/cancel` endpoints.

## Admin (`/admin`)

Cookie-session login (each user sets their password on first login).

- **Orders** — list, status, PM-status, approve-now, edit, delete (+ bulk)
- **Catalogue** — manage **brands & variants** and the option lists
  (**sizes, regions** + the region that hides Pantmærke). Print type
  (Label/Can) and the per-print-type finish lists are fixed in code.
- **Settings** — Brandsurface recipient email, forward delay, sidebar help box
- **Users** (master only) — add/reset/delete admins

The whole order form is data-driven from the Catalogue + Settings, so brands,
variants and option lists are all editable without code changes.

## Setup

### 1. Supabase

1. Create a project on [supabase.com](https://supabase.com)
2. SQL Editor → run `supabase-schema.sql`, then `admin-schema.sql`
3. Settings → API → copy the **Project URL** and the **service_role** secret

### 2. Resend

1. [resend.com](https://resend.com) → **API Keys** → create a key with
   `Sending access`
2. **Domains** → add & verify `brandsurface.dk` (or a subdomain) — SPF/DKIM
   records shown in the dashboard. Sending fails until this is done; the app
   requires `SENDER_EMAIL` explicitly rather than falling back to Resend's
   shared test sender (`onboarding@resend.dev`), which only delivers to the
   Resend account owner's own address.
3. Set `SENDER_EMAIL` to an address on the verified domain (e.g.
   `ordre@brandsurface.dk`).

Display name is `SENDER_NAME` when set; otherwise each mail uses its own neutral
label (`Ordre`, `Ny ordre`).

### 3. Environment variables

Copy `.env.example` → `.env.local` (local) or add them in Vercel:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (service_role) |
| `RESEND_API_KEY` | Resend → API Keys |
| `SENDER_EMAIL` | Address on a domain verified in Resend (required — no test-sender fallback) |
| `SENDER_NAME` | Display name; overrides the per-mail label when set (optional) |
| `BRANDSURFACE_EMAIL` | Fallback recipient (also editable in admin) |
| `ADMIN_SESSION_SECRET` | Long random string (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_BASE_URL` | Your deployed URL (used in email links) |

### 4. Local development

```bash
npm install
cp .env.example .env.local   # fill it in
npm run dev
```

Open `http://localhost:3000` (form) and `http://localhost:3000/admin` (admin).
The master admin user (`itpc@brandsurface.dk`) sets its password on first login.

## Project structure

```
app/
  page.jsx / page.html        Customer form (HTML template injected server-side)
  api/
    order/                    POST → create order + customer mail + scheduled forward
    confirm/ cancel/          Email Approve / Edit links
    order-data/               GET → order data for prefill (?edit=)
    upload-url/               Signed direct-to-storage upload URLs
    admin/                    Admin actions (orders, products=catalogue, settings, users, login)
  admin/                      Admin dashboard (orders, catalogue, settings, users)
  godkendt/                   Post-approval landing page
lib/
  supabase.js translations.js emails.js dispatch.js session.js admin-auth.js admin-i18n.js
public/
  order.css order.client.js brandsurface.svg
supabase-schema.sql           Core orders table
admin-schema.sql              Admin users, settings, brands catalogue, storage bucket
```
