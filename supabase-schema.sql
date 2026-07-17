-- ══════════════════════════════════════════════════════
-- CORE SCHEMA — run this in SUPABASE → SQL EDITOR first
-- (then run admin-schema.sql)
-- ══════════════════════════════════════════════════════
--
-- "Can Artwork & Production — Brief": one order = one can brief
-- (brand, variant, size, technical specs and production details).

create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  status        text not null default 'pending'
                check (status in ('pending', 'confirmed', 'cancelled')),

  -- Orderer / project
  butiksnavn    text not null,          -- campaign / project name
  navn          text not null,          -- contact name
  email         text not null,          -- contact email
  delivery_date date,                   -- desired deadline (optional)

  -- The can brief
  brand         text,
  variant       text,
  size          text,
  region        text,                   -- 'DK' | 'Border'
  label_type    text,                   -- 'Label' | 'Tryk'
  cutterguide   text,
  finish        text,                   -- 'Mat' | 'Gloss' | 'To be confirmed'
  paper         text,                   -- Label only: 'White' | 'Metallic' | 'Transparent' | 'To be confirmed'
  energy_kj     text,                   -- energy per 100 ml (kJ)
  energy_kcal   text,                   -- energy per 100 ml (kcal)
  units         text,                   -- number of units (genstande)
  material_old  text,
  material_new  text,
  ean           text,
  pantmaerke    boolean default false,  -- deposit mark (required for DK, n/a for Border)
  ingredients   text,                   -- ingredients & nutritional content (free text or "see file")

  -- Artwork
  andet         text,                   -- brief / notes
  artwork_help  boolean default false,  -- customer wants Brandsurface to create artwork
  smash_link    boolean default false,  -- customer wants a Smash upload link
  uploads       jsonb not null default '[]',  -- [{path,name,size}] in the order-uploads bucket

  -- Meta
  language      text default 'en' check (language in ('en','da')),
  revision      integer default 0,
  pm_status     text,                   -- internal project-management status
  send_after    timestamptz,           -- when the Brandsurface mail is scheduled
  scheduled_email_id text,              -- Brevo batchId of the scheduled mail (for cancel)

  -- Podio job (created from Admin)
  podio_item_id  bigint,
  podio_job_no   text,
  podio_job_name text,
  podio_link     text
);

-- Backfill columns for installs that predate the can model (idempotent)
alter table orders add column if not exists brand        text;
alter table orders add column if not exists variant      text;
alter table orders add column if not exists size         text;
alter table orders add column if not exists region       text;
alter table orders add column if not exists label_type   text;
alter table orders add column if not exists cutterguide  text;
alter table orders add column if not exists finish       text;
alter table orders add column if not exists paper        text;
alter table orders add column if not exists energy_kj     text;
alter table orders add column if not exists energy_kcal   text;
alter table orders add column if not exists units         text;
alter table orders add column if not exists material_old text;
alter table orders add column if not exists material_new text;
alter table orders add column if not exists ean          text;
alter table orders add column if not exists pantmaerke   boolean default false;
alter table orders add column if not exists ingredients  text;
alter table orders add column if not exists andet        text;
alter table orders add column if not exists artwork_help boolean default false;
alter table orders add column if not exists smash_link   boolean default false;
alter table orders add column if not exists uploads      jsonb not null default '[]';
alter table orders add column if not exists language     text default 'en';
alter table orders add column if not exists revision     integer default 0;
alter table orders add column if not exists pm_status    text;
alter table orders add column if not exists send_after   timestamptz;
alter table orders add column if not exists scheduled_email_id text;
alter table orders add column if not exists podio_item_id  bigint;
alter table orders add column if not exists podio_job_no   text;
alter table orders add column if not exists podio_job_name text;
alter table orders add column if not exists podio_link     text;

-- Keep updated_at fresh.
-- search_path pinned to '' to avoid the "Function Search Path Mutable" linter
-- warning; now() lives in pg_catalog and still resolves correctly.
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at
  before update on orders
  for each row execute procedure set_updated_at();

-- Row Level Security: no public access.
-- All access goes through Next.js server routes using the service_role key.
alter table orders enable row level security;
