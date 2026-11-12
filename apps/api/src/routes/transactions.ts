import { Hono } from 'hono';
import {
  createTransactionSchema,
  importTransactionLinkFilterSchema,
  patchTransactionSchema,
} from '@ploutizo/validators';
import {
  DATE_RANGE_OPERATORS,
  TRANSACTION_TYPE_VALUES,
  isDateRangeOperator,
} from '@ploutizo/types';
import type { DateRangeOperator, TransactionType } from '@ploutizo/types';
import type { ListQueryParams } from '@/services/transactions';
import type { AppEnv } from '@/types';
import { DomainError } from '@/lib/errors';
import { appValidator } from '@/lib/validator';
import { createTransaction } from '@/services/transaction-create';
import {
  deleteTransaction,
  getTransaction,
  listTransactions,
  restoreTransaction,
  updateTransaction,
} from '@/services/transactions';

const transactionsRouter = new Hono<AppEnv>();

const parseListParam = (value: string | undefined): string[] | undefined => {
  const values = [
    ...new Set(
      (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
  return values.length > 0 ? values : undefined;
};

const isTransactionType = (value: string): value is TransactionType =>
  TRANSACTION_TYPE_VALUES.some((type) => type === value);

const parseTypesParam = (
  value: string | undefined
): TransactionType[] | undefined => {
  const values = parseListParam(value);
  if (!values) return undefined;
  const types = values.filter(isTransactionType);
  if (types.length !== values.length) {
    throw new DomainError(
      400,
      'type must be a comma-separated list of transaction types.',
      'INVALID_TRANSACTION_TYPE_FILTER'
    );
  }
  return types;
};

const parseDateRangeOp = (
  value: string | undefined
): DateRangeOperator | undefined => {
  if (!value) return undefined;
  if (isDateRangeOperator(value)) return value;
  throw new DomainError(
    400,
    `dateRange_op must be one of ${DATE_RANGE_OPERATORS.join(', ')}.`,
    'INVALID_DATE_RANGE_OPERATOR'
  );
};

// POST / — create transaction (D-01, D-02, D-09, D-10, D-11, D-13)
transactionsRouter.post(
  '/',
  appValidator('json', createTransactionSchema),
  async (c) => {
    const orgId = c.get('principal').activeHouseholdId;
    const data = c.req.valid('json');
    const row = await createTransaction(orgId, data);
    return c.json({ data: row }, 201);
  }
);

// GET / — paginated list with filtering and sort (D-06, D-07, D-08)
transactionsRouter.get('/', async (c) => {
  const orgId = c.get('principal').activeHouseholdId;

  const rawPage = Number(c.req.query('page'));
  const rawLimit = Number(c.req.query('limit'));
  const page =
    Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(200, Math.max(1, Math.floor(rawLimit)))
    : 50;
  const rawSort = c.req.query('sort');
  const sort =
    rawSort === 'amount' ||
    rawSort === 'type' ||
    rawSort === 'category' ||
    rawSort === 'account'
      ? rawSort
      : 'date';
  const order = c.req.query('order') === 'asc' ? 'asc' : 'desc';

  // tagIds: support ?tagIds[]=x&tagIds[]=y AND ?tagIds=x,y (Pitfall 5)
  const tagIdsArr = c.req.queries('tagIds[]') ?? [];
  const tagIdsComma = c.req.query('tagIds');
  const tagIds = parseListParam([...tagIdsArr, tagIdsComma ?? ''].join(','));
  const importBatchId = c.req.query('importBatchId');
  const importOutcome = c.req.query('importOutcome');
  let importLink: ListQueryParams['importLink'];
  if (importBatchId !== undefined || importOutcome !== undefined) {
    const parsed = importTransactionLinkFilterSchema.safeParse({
      batchId: importBatchId,
      outcome: importOutcome,
    });
    if (!parsed.success) {
      throw new DomainError(
        400,
        'importBatchId and importOutcome must both be provided.',
        'INVALID_IMPORT_LINK_FILTER'
      );
    }
    importLink = parsed.data;
  }

  const params: ListQueryParams = {
    orgId,
    page,
    limit,
    sort,
    order,
    types: parseTypesParam(c.req.query('type')),
    accountIds: parseListParam(c.req.query('accountId')),
    dateFrom: c.req.query('dateFrom'),
    dateTo: c.req.query('dateTo'),
    categoryIds: parseListParam(c.req.query('categoryId')),
    assigneeIds: parseListParam(c.req.query('assigneeId')),
    tagIds,
    search: c.req.query('search')?.trim() || undefined,
    dateRange_op: parseDateRangeOp(c.req.query('dateRange_op')),
    importLink,
  };

  const result = await listTransactions(params);
  return c.json(result);
});

// GET /:id — single transaction with joined response (D-04, D-05)
transactionsRouter.get('/:id', async (c) => {
  const orgId = c.get('principal').activeHouseholdId;
  const id = c.req.param('id');
  const row = await getTransaction(orgId, id);
  return c.json({ data: row });
});

// PATCH /:id/restore — undo soft delete (D-15)
// IMPORTANT: declared before PATCH /:id so Hono matches '/restore' path segment correctly (T-03.3-02, T-03.3-03)
transactionsRouter.patch('/:id/restore', async (c) => {
  const orgId = c.get('principal').activeHouseholdId;
  const id = c.req.param('id');
  const result = await restoreTransaction(orgId, id);
  return c.json({ data: result });
});

// PATCH /:id — update fields + replace-all assignees/tags (D-03, D-08, D-10, D-11)
// D-08: patchTransactionSchema = discriminated union + rejects assignees: [] (cannot clear splits via empty array)
transactionsRouter.patch(
  '/:id',
  appValidator('json', patchTransactionSchema),
  async (c) => {
    const orgId = c.get('principal').activeHouseholdId;
    const id = c.req.param('id');
    const data = c.req.valid('json');
    const updated = await updateTransaction(orgId, id, data);
    return c.json({ data: updated });
  }
);

// DELETE /:id — soft delete (D-15)
transactionsRouter.delete('/:id', async (c) => {
  const orgId = c.get('principal').activeHouseholdId;
  const id = c.req.param('id');
  const result = await deleteTransaction(orgId, id);
  return c.json({ data: result });
});

export { transactionsRouter };
