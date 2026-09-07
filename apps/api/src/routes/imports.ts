import { Hono } from 'hono';
import {
  createImportDraftSchema,
  finalizeImportDraftSchema,
  importHistoryQuerySchema,
  updateImportDraftRowSchema,
  updateImportDraftRowSelectionSchema,
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
  updateImportDraftRow,
  updateImportDraftRowSelection,
} from '@/services/imports';
import { listImportHistory } from '@/services/import-history';
import {
  continueImportDraft,
  getActiveImportPreparedConfirmation,
  invalidateImportPreparedSet,
} from '@/services/import-prepared-sets';
import { finalizeImportDraft } from '@/services/import-finalize';

const importsRouter = new Hono<AppEnv>();

importsRouter.get('/targets', async (c) => {
  const orgId = c.get('orgId');
  const rows = await listImportTargets(orgId);
  return c.json({ data: rows });
});

importsRouter.get('/drafts', async (c) => {
  const orgId = c.get('orgId');
  const rows = await listActiveImportDrafts(orgId);
  return c.json({ data: rows });
});

importsRouter.post(
  '/drafts',
  appValidator('json', createImportDraftSchema),
  async (c) => {
    const orgId = c.get('orgId');
    const input = c.req.valid('json');
    const result = await createImportDraft(orgId, input);
    if (result.kind === 'mapping_required') {
      return c.json(result);
    }
    return c.json(result, result.meta.reusedExisting ? 200 : 201);
  }
);

importsRouter.get('/drafts/:id', async (c) => {
  const orgId = c.get('orgId');
  const row = await getImportDraft(orgId, c.req.param('id'));
  return c.json({ data: row });
});

importsRouter.delete('/drafts/:id', async (c) => {
  const orgId = c.get('orgId');
  const row = await discardImportDraft(orgId, c.req.param('id'));
  return c.json({ data: row });
});

importsRouter.post('/drafts/:id/continue', async (c) => {
  const orgId = c.get('orgId');
  const preparedSet = await continueImportDraft(orgId, c.req.param('id'));
  return c.json({ data: preparedSet }, 201);
});

importsRouter.get('/drafts/:id/prepared', async (c) => {
  const orgId = c.get('orgId');
  const prepared = await getActiveImportPreparedConfirmation(
    orgId,
    c.req.param('id')
  );
  return c.json({ data: prepared });
});

importsRouter.delete('/drafts/:id/prepared', async (c) => {
  const orgId = c.get('orgId');
  await invalidateImportPreparedSet(orgId, c.req.param('id'));
  return new Response(null, { status: 204 });
});

importsRouter.post(
  '/drafts/:id/finalize',
  appValidator('json', finalizeImportDraftSchema),
  async (c) => {
    const orgId = c.get('orgId');
    const { preparedSetId } = c.req.valid('json');
    const result = await finalizeImportDraft(
      orgId,
      c.req.param('id'),
      preparedSetId
    );
    return c.json({ data: result });
  }
);

importsRouter.patch(
  '/rows/:id',
  appValidator('json', updateImportDraftRowSchema),
  async (c) => {
    const orgId = c.get('orgId');
    const input = c.req.valid('json');
    const result = await updateImportDraftRow(orgId, c.req.param('id'), input);
    return c.json({
      data: result.row,
      ...(result.refundTargetFacts
        ? { refundTargetFacts: result.refundTargetFacts }
        : {}),
    });
  }
);

importsRouter.patch(
  '/drafts/:id/rows/selection',
  appValidator('json', updateImportDraftRowSelectionSchema),
  async (c) => {
    const orgId = c.get('orgId');
    const input = c.req.valid('json');
    const rows = await updateImportDraftRowSelection(
      orgId,
      c.req.param('id'),
      input
    );
    return c.json({ data: rows });
  }
);

importsRouter.get(
  '/history',
  appValidator('query', importHistoryQuerySchema),
  async (c) => {
    const orgId = c.get('orgId');
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
