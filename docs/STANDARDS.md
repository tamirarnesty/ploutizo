# Engineering Standards

## Tenant-scoped foreign keys

Use database constraints to enforce tenancy whenever an org-owned table
references another org-owned table.

- A child table with `org_id` must reference an org-owned parent with a composite
  foreign key: `(parent_id, org_id) → parent(id, org_id)`.
- The parent must expose a unique `(id, org_id)` key for that reference.
- Do not add a parallel single-column foreign key on `parent_id`; the composite
  constraint already enforces existence and tenant ownership.
- Keep the child table's standalone `org_id → orgs(id)` foreign key.
- Add a supporting index only when it is not already covered by the leftmost
  columns of an existing unique or non-unique index.

For composite foreign keys whose referenced ID is nullable, use a
column-specific delete action such as `ON DELETE SET NULL (parent_id)`. Never
use bare `ON DELETE SET NULL`, which would also attempt to null the required
`org_id` column.

When a child table does not carry `org_id`, do not add it solely to force a
composite foreign key without an explicit schema-design decision. Use
application-level ownership checks until that relationship is migrated
deliberately.

For existing deployed tables, introduce this pattern through a forward-only
migration; do not rewrite an already-applied migration.
