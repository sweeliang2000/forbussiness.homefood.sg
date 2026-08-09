-- Shop ratings and the business activity log.
--
-- Run this in the Supabase SQL editor. Two features point at this file by name
-- when their table is missing:
--
--   src/app/app/activity-log/page.js:160  "run scripts/add-ratings-and-activity.sql"
--   src/lib/server/controllers/ratings.js:109
--
-- ...but the file itself did not exist, so following that instruction got you
-- nowhere. Both features degrade rather than crash until this runs: the ratings
-- reader catches 42P01 and returns an empty list, and the activity log reader
-- catches it and returns migrationNeeded: true.
--
-- Safe to re-run.


-- ===========================================================================
-- shop_ratings
-- ===========================================================================
--
-- Column shapes are owned by src/lib/server/controllers/ratings.js and the
-- mapper in src/app/app/ratings/page.js (`toReview`).

create table if not exists public.shop_ratings (
  id           bigint generated always as identity primary key,
  shop_id      text        not null,
  rating       smallint    not null check (rating between 1 and 5),
  customer_name text,
  comment      text,

  -- Merchant's public reply. Written by replyToRating; response_at doubles as
  -- "has been replied to".
  response     text,
  response_at  timestamptz,

  created_at   timestamptz not null default now()
);

-- Moderation, read by the visibility filter at ratings.js:47. A review is shown
-- when it is approved, or still pending but older than the 3-day auto-approve
-- window. Rejected reviews are never shown.
--
-- Added separately from the create so an existing table picks them up too —
-- ratings.js explicitly falls back to "show all" on error code 42703 when these
-- are absent, so an un-migrated deployment keeps working.
alter table public.shop_ratings
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected'));

alter table public.shop_ratings
  add column if not exists submitted_at timestamptz not null default now();

-- The reader always filters by shop and orders by recency.
create index if not exists shop_ratings_shop_created_idx
  on public.shop_ratings (shop_id, created_at desc);

-- Supports the visibility filter without scanning the shop's whole history.
create index if not exists shop_ratings_shop_status_idx
  on public.shop_ratings (shop_id, status, submitted_at);


-- ===========================================================================
-- business_activity_log
-- ===========================================================================
--
-- Column shapes are owned by recordActivity in
-- src/lib/server/controllers/activityLog.js.
--
-- Named for the side of the product it belongs to. This log records what a
-- shop's own team does in the business console; `activity_log` is left free
-- for a customer-facing equivalent, since both sites share one Supabase
-- project.

-- Renamed from activity_log. This has to run *before* the create below, or an
-- existing deployment gets a second, empty table beside the populated one.
-- Postgres keeps index names across a table rename, so those move too —
-- otherwise the creates further down would add duplicates under new names.
do $$
begin
  if to_regclass('public.activity_log') is not null
     and to_regclass('public.business_activity_log') is null then
    alter table public.activity_log rename to business_activity_log;

    if to_regclass('public.activity_log_shop_created_idx') is not null then
      alter index public.activity_log_shop_created_idx
        rename to business_activity_log_shop_created_idx;
    end if;
    if to_regclass('public.activity_log_shop_actor_idx') is not null then
      alter index public.activity_log_shop_actor_idx
        rename to business_activity_log_shop_actor_idx;
    end if;
    if to_regclass('public.activity_log_shop_action_idx') is not null then
      alter index public.activity_log_shop_action_idx
        rename to business_activity_log_shop_action_idx;
    end if;
  end if;
end $$;

create table if not exists public.business_activity_log (
  id          bigint generated always as identity primary key,

  shop_id     text        not null,
  actor_id    text,                    -- user_id (email) of whoever acted
  actor_role  text,                    -- Owner | Manager | Operator at the time

  action      text        not null,    -- e.g. order.status, user.role_change
  entity_type text,
  entity_id   text,                    -- always stored as text, see activityLog.js

  detail      jsonb       not null default '{}'::jsonb,

  created_at  timestamptz not null default now()
);

-- Request context for auth events. Nullable because it is only available
-- behind Vercel's edge (x-vercel-ip-*) — locally these stay null and the UI
-- renders "Unknown location".
--
-- An IP is personal data under Singapore's PDPA. The privacy policy at
-- /privacy already discloses that technical information including IP address
-- is collected; keep that true if these are ever surfaced more widely.
alter table public.business_activity_log add column if not exists ip         text;
alter table public.business_activity_log add column if not exists user_agent text;
alter table public.business_activity_log add column if not exists city       text;
alter table public.business_activity_log add column if not exists country    text;
-- Vercel reports region separately from city and country, and the sign-in
-- panel shows all three.
alter table public.business_activity_log add column if not exists region     text;

-- The sign-in panel reads one member's history: same shop, same actor, only
-- user.login, newest first. The (shop_id, actor_id) index above doesn't order,
-- so this keeps that query off a sort.
create index if not exists business_activity_log_signin_idx
  on public.business_activity_log (shop_id, actor_id, created_at desc)
  where action = 'user.login';

-- getActivityLog filters by shop and orders by created_at desc, limit <= 500.
create index if not exists business_activity_log_shop_created_idx
  on public.business_activity_log (shop_id, created_at desc);

-- The actor and action dropdowns are built from the returned window, but these
-- keep the optional ?actor= and ?action= filters off a sequential scan.
create index if not exists business_activity_log_shop_actor_idx
  on public.business_activity_log (shop_id, actor_id);

create index if not exists business_activity_log_shop_action_idx
  on public.business_activity_log (shop_id, action);


-- ===========================================================================
-- Retention of request context
-- ===========================================================================
--
-- Postgres has no TTL, so without this the IP and user-agent of every sign-in
-- are kept forever. Both are personal data under the PDPA, which expects them
-- to be retained only as long as they serve the purpose they were collected
-- for — here, investigating suspicious access.
--
-- This scrubs the context rather than deleting the row: after 90 days you
-- still want to know a sign-in happened, you just no longer need to know from
-- which address. The audit trail survives; the personal data doesn't.
--
-- Safe to run repeatedly, and cheap — the partial index above keeps it from
-- scanning the whole table.
create or replace function public.scrub_signin_context(older_than interval default '90 days')
returns integer
language sql
security definer
set search_path = public
as $$
  with scrubbed as (
    update public.business_activity_log
       set ip = null, user_agent = null, city = null, region = null, country = null
     where action = 'user.login'
       and created_at < now() - older_than
       and (ip is not null or user_agent is not null
            or city is not null or region is not null or country is not null)
    returning 1
  )
  select count(*)::integer from scrubbed;
$$;

-- Schedule it. pg_cron is available on Supabase but is not enabled by default;
-- enable it under Database → Extensions, or with the statement below.
--
--   create extension if not exists pg_cron;
--
--   select cron.schedule(
--     'scrub-signin-context',
--     '17 3 * * *',                      -- daily, 03:17 UTC
--     $$select public.scrub_signin_context()$$
--   );
--
-- Until that is scheduled, run `select public.scrub_signin_context();` by hand
-- or the retention policy exists only on paper.


-- ===========================================================================
-- Row level security
-- ===========================================================================
--
-- Both tables are reached only from the server using the service-role key
-- (src/lib/server/supabase.js), which bypasses RLS. Enabling it with no policy
-- means that if an anon or authenticated key is ever pointed at this project,
-- it reads nothing rather than every merchant's audit trail.

alter table public.shop_ratings enable row level security;
alter table public.business_activity_log enable row level security;
