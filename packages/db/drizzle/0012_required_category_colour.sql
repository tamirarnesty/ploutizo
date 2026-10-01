-- Backfill categories with no colour (or a colour outside the palette) from the default
-- category colour ordering in @ploutizo/types (DEFAULT_CATEGORY_COLOUR_ORDER), per org by
-- sort order (skipping colours the org already uses), then require a colour on every category.
WITH "palette" AS (
  SELECT ARRAY[
    'red-500', 'orange-500', 'amber-500', 'yellow-500', 'lime-500', 'green-500',
    'emerald-500', 'teal-500', 'cyan-500', 'sky-500', 'blue-500', 'indigo-500',
    'violet-500', 'purple-500', 'fuchsia-500', 'pink-500', 'rose-500', 'slate-500',
    'red-400', 'orange-400', 'amber-400', 'yellow-400', 'lime-400', 'green-400',
    'emerald-400', 'teal-400', 'cyan-400', 'sky-400', 'blue-400', 'indigo-400',
    'violet-400', 'purple-400', 'fuchsia-400', 'pink-400', 'rose-400', 'slate-400',
    'red-600', 'orange-600', 'amber-600', 'yellow-600', 'lime-600', 'green-600',
    'emerald-600', 'teal-600', 'cyan-600', 'sky-600', 'blue-600', 'indigo-600',
    'violet-600', 'purple-600', 'fuchsia-600', 'pink-600', 'rose-600', 'slate-600',
    'red-300', 'orange-300', 'amber-300', 'yellow-300', 'lime-300', 'green-300',
    'emerald-300', 'teal-300', 'cyan-300', 'sky-300', 'blue-300', 'indigo-300',
    'violet-300', 'purple-300', 'fuchsia-300', 'pink-300', 'rose-300', 'slate-300',
    'red-700', 'orange-700', 'amber-700', 'yellow-700', 'lime-700', 'green-700',
    'emerald-700', 'teal-700', 'cyan-700', 'sky-700', 'blue-700', 'indigo-700',
    'violet-700', 'purple-700', 'fuchsia-700', 'pink-700', 'rose-700', 'slate-700'
  ]::text[] AS "tokens"
),
"free" AS (
  -- Per org, the palette colours no category there already uses, in default order.
  SELECT "orgs"."org_id", array_agg("t"."token" ORDER BY "t"."ord") AS "tokens"
  FROM (SELECT DISTINCT "org_id" FROM "categories") AS "orgs"
  CROSS JOIN "palette"
  CROSS JOIN LATERAL unnest("palette"."tokens") WITH ORDINALITY AS "t"("token", "ord")
  WHERE NOT EXISTS (
    SELECT 1 FROM "categories" AS "used"
    WHERE "used"."org_id" = "orgs"."org_id" AND "used"."colour" = "t"."token"
  )
  GROUP BY "orgs"."org_id"
),
"backfill" AS (
  SELECT
    "categories"."id",
    -- Unused colours first, then the whole palette once an org runs out of them.
    (coalesce("free"."tokens", ARRAY[]::text[]) || "palette"."tokens") AS "choices",
    (row_number() OVER (
      PARTITION BY "categories"."org_id"
      ORDER BY "categories"."sort_order", "categories"."id"
    ) - 1)::int AS "position"
  FROM "categories"
  CROSS JOIN "palette"
  LEFT JOIN "free" ON "free"."org_id" = "categories"."org_id"
  WHERE "categories"."colour" IS NULL
    OR NOT ("categories"."colour" = ANY ("palette"."tokens"))
)
UPDATE "categories"
SET "colour" = "backfill"."choices"[("backfill"."position" % cardinality("backfill"."choices")) + 1]
FROM "backfill"
WHERE "categories"."id" = "backfill"."id";--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "colour" SET NOT NULL;
