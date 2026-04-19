import { Hono } from 'hono';
import { appValidator } from '../lib/validator';
import { DomainError } from '../lib/errors';
import {
  createTransactionSchema,
} from '@ploutizo/validators';
import {
  checkRefundOfOwnership,
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  restoreTransaction,
  updateTransaction,
  validateSplitSum,
} from '../services/transactions';
import type { ListQueryParams } from '../services/transactions';
import type { AppEnv } from '../types';

const transactionsRouter = new Hono<AppEnv>();

// POST / — create transaction (D-01, D-02, D-09, D-10, D-11, D-13)
transactionsRouter.post('/', appValidator('json', createTransactionSchema), async (c) => {
  const orgId = c.get('orgId');
  const data = c.req.valid('json');

  // D-11: validate split sum before hitting DB
  const splitError = validateSplitSum(data.amount, data.assignees);
  if (splitError) {
    return c.json({ error: { code: 'BAD_REQUEST', message: splitError } }, 400);
  }

  // D-13: validate refundOf org ownership if provided — gate on field presence, not type.
  // Use 'in' narrowing because refundOf only exists on the 'refund' variant of the discriminated union.
  if ('refundOf' in data && data.refundOf) {
    const owned = await checkRefundOfOwnership(data.refundOf, orgId);
    if (!owned) throw new DomainError(400, 'refundOf transaction not found in this org');
  }

  const row = await createTransaction(orgId, data);
  return c.json({ data: row }, 201);
});

// GET / — paginated list with filtering and sort (D-06, D-07, D-08)
transactionsRouter.get('/', async (c) => {
  const orgId = c.get('orgId');

  const rawPage = Number(c.req.query('page'));
  const rawLimit = Number(c.req.query('limit'));
  const page =
    Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(200, Math.max(1, Math.floor(rawLimit)))
    : 50;
  const rawSort = c.req.query('sort');
  const sort = (
    rawSort === 'amount' || rawSort === 'type' ||
    rawSort === 'category' || rawSort === 'account'
      ? rawSort : 'date'
  );
  const order = c.req.query('order') === 'asc' ? 'asc' : 'desc';

  // tagIds: support ?tagIds[]=x&tagIds[]=y AND ?tagIds=x,y (Pitfall 5)
  const tagIdsArr = c.req.queries('tagIds[]') ?? [];
  const tagIdsComma = c.req.query('tagIds');
  const tagIds = [
    ...tagIdsArr,
    ...(tagIdsComma ? tagIdsComma.split(',').filter(Boolean) : []),
  ];

  const params: ListQueryParams = {
    orgId,
    page,
    limit,
    sort,
    order,
    type: c.req.query('type'),
    accountId: c.req.query('accountId'),
    dateFrom: c.req.query('dateFrom'),
    dateTo: c.req.query('dateTo'),
    categoryId: c.req.query('categoryId'),
    assigneeId: c.req.query('assigneeId'),
    tagIds: tagIds.length > 0 ? tagIds : undefined,
    description: c.req.query('description'),
  };

  const result = await listTransactions(params);
  return c.json(result);
});

// GET /:id — single transaction with joined response (D-04, D-05)
transactionsRouter.get('/:id', async (c) => {
  const orgId = c.get('orgId');
  const id = c.req.param('id');
  const row = await getTransaction(id, orgId);
  if (!row) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Transaction not found.' } },
      404
    );
  }
  return c.json({ data: row });
});

// PATCH /:id/restore — undo soft delete (D-15)
// IMPORTANT: declared before PATCH /:id so Hono matches '/restore' path segment correctly (T-03.3-02, T-03.3-03)
transactionsRouter.patch('/:id/restore', async (c) => {
  const orgId = c.get('orgId');
  const id = c.req.param('id');
  const result = await restoreTransaction(id, orgId);
  if (!result) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Transaction not found.' } },
      404
    );
  }
  return c.json({ data: result });
});

// PATCH /:id — update fields + replace-all assignees/tags (D-03, D-08, D-10, D-11)
// D-08: uses createTransactionSchema (discriminated union) to enforce type-specific required fields on type change
transactionsRouter.patch('/:id', appValidator('json', createTransactionSchema), async (c) => {
  const orgId = c.get('orgId');
  const id = c.req.param('id');
  const data = c.req.valid('json');

  // T-03.4-02: validate refundOf org ownership if provided — mirrors POST guard
  // Use 'in' narrowing because refundOf only exists on the 'refund' variant of the discriminated union.
  if ('refundOf' in data && data.refundOf) {
    const owned = await checkRefundOfOwnership(data.refundOf, orgId);
    if (!owned) throw new DomainError(400, 'refundOf transaction not found in this org');
  }

  let updated;
  try {
    updated = await updateTransaction(id, orgId, data);
  } catch (err) {
    // updateTransaction throws on split sum mismatch (D-11)
    const message = err instanceof Error ? err.message : 'Invalid request';
    return c.json({ error: { code: 'BAD_REQUEST', message } }, 400);
  }

  if (!updated) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Transaction not found.' } },
      404
    );
  }
  return c.json({ data: updated });
});

// DELETE /:id — soft delete (D-15)
transactionsRouter.delete('/:id', async (c) => {
  const orgId = c.get('orgId');
  const id = c.req.param('id');
  const result = await deleteTransaction(id, orgId);
  if (!result) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Transaction not found.' } },
      404
    );
  }
  return c.json({ data: result });
});

export { transactionsRouter };
