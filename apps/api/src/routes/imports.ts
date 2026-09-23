import { Hono } from 'hono';
import {
  batchUpdateImportDraftRowsSchema,
  continueImportDraftSchema,
  createImportDraftSchema,
  finalizeImportDraftSchema,
  importHistoryQuerySchema,
} from '@ploutizo/validators';
import type { AppEnv } from '@/types';
import { appValidator } from '@/lib/validator';
import {
  createImportDraft,
  discardImportDraft,
  getImportDraft,
  getImportExampleCsv,
  listActiveImportDrafts,
  listImportTargets,
  updateImportDraftRows,
} from '@/services/imports';
import { listImportHistory } from '@/services/import-history';
import { continueImportDraft } from '@/services/import-continue';
import { finalizeImportDraft } from '@/services/import-finalize';

const importsRouter = new Hono<AppEnv>();

importsRouter.get('/targets', async (c) => {
  const orgId = c.get('principal').activeHouseholdId;
  const rows = await listImportTargets(orgId);
  return c.json({ data: rows });
});

importsRouter.get('/drafts', async (c) => {
  const orgId = c.get('principal').activeHouseholdId;
  const rows = await listActiveImportDrafts(orgId);
  return c.json({ data: rows });
});

importsRouter.post(
  '/drafts',
  appValidator('json', createImportDraftSchema),
  async (c) => {
    const orgId = c.get('principal').activeHouseholdId;
    const input = c.req.valid('json');
    const result = await createImportDraft(orgId, input);
    if (result.kind === 'mapping_required') {
      return c.json(result);
    }
    return c.json(result, result.meta.reusedExisting ? 200 : 201);
  }
);

importsRouter.get('/drafts/:id', async (c) => {
  const orgId = c.get('principal').activeHouseholdId;
  const row = await getImportDraft(orgId, c.req.param('id'));
  return c.json({ data: row });
});

importsRouter.delete('/drafts/:id', async (c) => {
  const orgId = c.get('principal').activeHouseholdId;
  const row = await discardImportDraft(orgId, c.req.param('id'));
  return c.json({ data: row });
});

importsRouter.post(
  '/drafts/:id/continue',
  appValidator('json', continueImportDraftSchema),
  async (c) => {
    const orgId = c.get('principal').activeHouseholdId;
    const { rowIds } = c.req.valid('json');
    const preview = await continueImportDraft({
      orgId,
      batchId: c.req.param('id'),
      rowIds,
    });
    return c.json({ data: preview });
  }
);

importsRouter.post(
  '/drafts/:id/finalize',
  appValidator('json', finalizeImportDraftSchema),
  async (c) => {
    const orgId = c.get('principal').activeHouseholdId;
    const { rowIds } = c.req.valid('json');
    const result = await finalizeImportDraft({
      orgId,
      batchId: c.req.param('id'),
      rowIds,
    });
    return c.json({ data: result });
  }
);

importsRouter.patch(
  '/drafts/:id/rows',
  appValidator('json', batchUpdateImportDraftRowsSchema),
  async (c) => {
    const orgId = c.get('principal').activeHouseholdId;
    const input = c.req.valid('json');
    const result = await updateImportDraftRows(orgId, c.req.param('id'), input);
    return c.json({
      data: result.rows,
      ...(result.refundTargetFacts
        ? { refundTargetFacts: result.refundTargetFacts }
        : {}),
    });
  }
);

importsRouter.get(
  '/history',
  appValidator('query', importHistoryQuerySchema),
  async (c) => {
    const orgId = c.get('principal').activeHouseholdId;
    const query = c.req.valid('query');
    const page = await listImportHistory(orgId, query);
    return c.json(page);
  }
);

importsRouter.get('/normalized-example.csv', (c) => {
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header(
    'Content-Disposition',
    'attachment; filename="ploutizo-normalized-import-example.csv"'
  );
  return c.body(getImportExampleCsv());
});

export { importsRouter };
