-- Delivery settings for shops.
--
-- Run this in the Supabase SQL editor before publishing any shop that has
-- delivery turned on. Until it exists, publishOrderingSettingsUpdate will fail
-- on the two new columns; saving delivery to DynamoDB works without it, so
-- merchants can configure delivery before this lands, they just can't publish.
--
-- Safe to re-run.

-- Flat flag so the storefront can list "shops that deliver" without unpacking
-- the json.
alter table public.shops
  add column if not exists delivery_enabled boolean not null default false;

-- The full pricing config. Shape is owned by src/utility/deliveryZones.js:
--
--   {
--     "enabled":  true,
--     "mode":     "fixed" | "zone",
--     "fixedFee": 5.00,
--     "zoneFees":    { "north": 6, "south": 4, "east": 8, "west": 7 },
--     "zoneEnabled": { "north": true, "south": true, "east": true, "west": false },
--     "zoneEtaMinutes": { "north": 60, "south": 30, "east": 45, "west": 45 }
--   }
--
-- zoneEnabled is coverage, not price: a region that is off is not delivered to
-- at all, which is different from a zoneFee of 0 (delivered to for free).
--
-- zoneEtaMinutes is the estimated door-to-door wait shown to the customer. It
-- is per-region in BOTH pricing modes — a flat fee doesn't make the drive to
-- Tuas as quick as the one down the street. Defaults to 45.
--
-- Kept as jsonb so the pricing model can gain fields (per-kg, distance bands,
-- time-of-day surcharges) without another migration.
alter table public.shops
  add column if not exists delivery_settings jsonb not null default '{}'::jsonb;

-- Storefront queries filter on "does this shop deliver" far more often than
-- they read the config, so index the flag rather than the blob.
create index if not exists shops_delivery_enabled_idx
  on public.shops (delivery_enabled)
  where delivery_enabled;

comment on column public.shops.delivery_enabled is
  'True when the merchant accepts delivery orders. Mirrored from Order_Settings on publish.';
comment on column public.shops.delivery_settings is
  'Delivery pricing config. Shape defined by src/utility/deliveryZones.js normalizeDelivery().';
