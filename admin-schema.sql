-- ══════════════════════════════════════════════════════
-- ADMIN MODULE — run this in SUPABASE → SQL EDITOR
-- (after supabase-schema.sql)
-- ══════════════════════════════════════════════════════

-- Admin users (cookie-session auth, managed from the admin UI)
create table if not exists admin_users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text,                       -- null until set on first login
  is_master     boolean not null default false,
  created_at    timestamptz default now()
);

-- Master user — password is set on first login
insert into admin_users (email, is_master)
  values ('itpc@brandsurface.dk', true)
  on conflict (email) do nothing;

-- ── Editable application settings (key/value) ──────────
create table if not exists app_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz default now()
);

-- Recipient for the "new approved order" email to Brandsurface.
-- Empty value falls back to the BRANDSURFACE_EMAIL env var.
insert into app_settings (key, value) values ('brandsurface_email', '')
  on conflict (key) do nothing;

-- Minutes to wait after submission before forwarding to Brandsurface
-- (grace period for the customer to edit). Set to 0 to send immediately.
insert into app_settings (key, value) values ('confirm_delay_minutes', '10')
  on conflict (key) do nothing;

-- Optional help / contact box shown on the order form sidebar
insert into app_settings (key, value) values ('help_box_active', '0')
  on conflict (key) do nothing;
insert into app_settings (key, value) values ('help_box_html', '')
  on conflict (key) do nothing;

-- ── Editable option lists for the can form (JSON arrays) ──
insert into app_settings (key, value)
  values ('sizes', '["250 ml","330 ml","330 ml slim","440 ml","500 ml"]')
  on conflict (key) do nothing;
insert into app_settings (key, value)
  values ('regions', '["DK","Border"]')
  on conflict (key) do nothing;
insert into app_settings (key, value)
  values ('label_types', '["Label","Tryk"]')
  on conflict (key) do nothing;
insert into app_settings (key, value)
  values ('finishes', '["Mat","Gloss","To be confirmed"]')
  on conflict (key) do nothing;
-- Selecting this region hides/omits the deposit mark (Pantmærke).
insert into app_settings (key, value) values ('pantmaerke_exempt_region', 'Border')
  on conflict (key) do nothing;

-- ── Editable hero text (page title + description, per language) ──
insert into app_settings (key, value) values ('hero_title_en', '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('hero_title_da', '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('hero_sub_en',   '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('hero_sub_da',   '') on conflict (key) do nothing;

-- ── Editable Order Process sidebar card (per language) ──
insert into app_settings (key, value) values ('op_label_en',        '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_label_da',        '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_sub_en',          '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_sub_da',          '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_step1_title_en',  '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_step1_title_da',  '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_step1_p_en',      '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_step1_p_da',      '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_step2_title_en',  '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_step2_title_da',  '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_step2_p_en',      '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_step2_p_da',      '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_step3_title_en',  '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_step3_title_da',  '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_step3_p_en',      '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_step3_p_da',      '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_step4_title_en',  '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_step4_title_da',  '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_step4_p_en',      '') on conflict (key) do nothing;
insert into app_settings (key, value) values ('op_step4_p_da',      '') on conflict (key) do nothing;

-- ── Podio integration (job creation from Admin) ──
-- App ID + field external-ids come from the Podio app's developer settings.
insert into app_settings (key, value) values ('podio_app_id', '')             on conflict (key) do nothing;
insert into app_settings (key, value) values ('podio_field_job_no', '')       on conflict (key) do nothing;
insert into app_settings (key, value) values ('podio_field_job_name', '')     on conflict (key) do nothing;
insert into app_settings (key, value) values ('podio_field_responsible', '')  on conflict (key) do nothing;
-- Admin-managed employees for the responsible picker: [{"name","podio_id"}]
insert into app_settings (key, value) values ('podio_employees', '[]')        on conflict (key) do nothing;

-- ── Editable brand catalogue (rendered as tiles on the form) ──
create table if not exists brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  variants    jsonb not null default '[]',   -- array of variant names
  sort        int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

-- Seed the brand catalogue (only when the table is still empty)
insert into brands (name, variants, sort)
select v.name, v.variants::jsonb, v.sort
from (values
  ('Tuborg',    '["Classic","Fine Festival","Grøn","Guld","Sprød","Twist","Sunsæt","Rød","Julebryg","Påskebryg"]', 10),
  ('Carlsberg', '["IPA","1883","Carls Jul","Carls Special","Carlsberg 47","Elephant","Nordic","Nordlyst","Pilsner","Sort Guld","Gamle Carlsberg","Gl. Carlsberg Porter","Master Brew"]', 20),
  ('Mikkeller', '["Big bad Pilsner","Blanche de Mikkeller","Burst IPA","Burst Free IPA","Drink''in the Sun","Drink''in the Winter","Golden Iris","Hop Hop IPA","Iskold Classic","Japanese Lager","Limbo Raspberry","Peach Out","Weird Weather","Windy Hill"]', 30),
  ('Jacobsen',  '["Brown Ale","Saaz Blonde","Barbaras Easy IPA","El Dorado IPA","Juicy IPA","Juletid IPA","Yakima","Yakima Økologisk","Golden Naked Christmas Ale","Påske Pale Ale"]', 40),
  ('Somersby',  '[]', 50),
  ('Grimbergen','["Belgian Pale Ale","Quadrupel","Tripe D''Abbaye","Blanche","Blonde","Double Ambreé","Noël"]', 60),
  ('Brooklyn',  '["Special Effects","Lager","East India","Bel Air Sour","Parktime IPA","Pilsner","Playa De Brooklyn","Pulp Art","Stonewall Inn IPA","Timemachine"]', 70),
  ('1664',      '["Blanc","Biere","Blanc 0,0"]', 80)
) as v(name, variants, sort)
where not exists (select 1 from brands);

-- ── File uploads bucket (private, 50 MB per file) ──────
insert into storage.buckets (id, name, public, file_size_limit)
values ('order-uploads', 'order-uploads', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- ── Customer accounts (self-signup, email-verified, cookie session) ──
-- Lets an orderer log in to see their orders, copy old ones and track status.
-- Emails are stored lowercased at the application layer.
create table if not exists customers (
  id             uuid primary key default gen_random_uuid(),
  email          text unique not null,
  password_hash  text,                          -- scrypt saltHex:hashHex (lib/admin-auth format)
  email_verified boolean not null default false,
  verify_code    text,                          -- 6-digit code, null after use
  verify_expires timestamptz,                   -- code time-to-live
  verify_sent_at timestamptz,                   -- last send (resend throttle)
  verify_attempts int not null default 0,       -- wrong-code counter (lockout)
  created_at     timestamptz default now()
);

-- Backfill columns for idempotent re-runs
alter table customers add column if not exists password_hash   text;
alter table customers add column if not exists email_verified  boolean not null default false;
alter table customers add column if not exists verify_code     text;
alter table customers add column if not exists verify_expires  timestamptz;
alter table customers add column if not exists verify_sent_at  timestamptz;
alter table customers add column if not exists verify_attempts int not null default 0;

-- Case-insensitive uniqueness guard (Foo@x.com == foo@x.com)
create unique index if not exists customers_email_lower_idx on customers (lower(email));

-- No public access — all access goes through Next.js server routes
-- using the service_role key (which bypasses RLS).
alter table admin_users  enable row level security;
alter table app_settings enable row level security;
alter table brands       enable row level security;
alter table customers    enable row level security;
