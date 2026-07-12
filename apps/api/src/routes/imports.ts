import { Hono } from 'hono';
import {
  createImportDraftSchema,
  updateImportDraftRowSchema,
  updateImportDraftRowSelectionSchema,
} from '@ploutizo/validators';
import type { AppEnv } from '@/types';
import { appValidator } from '@/lib/validator';
import {
  createNormalizedImportDraft,
  discardImportDraft,
  getImportDraft,
  getNormalizedImportExampleCsv,
  listActiveImportDrafts,
  listImportHistory,
  listImportTargets,
  updateImportDraftRow,
  updateImportDraftRowSelection,
} from '@/services/imports';

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
    const result = await createNormalizedImportDraft(orgId, input);
    return c.json(
      { data: result.draft, meta: { reusedExisting: result.reusedExisting } },
      result.reusedExisting ? 200 : 201
    );
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

importsRouter.patch(
  '/rows/:id',
  appValidator('json', updateImportDraftRowSchema),
  async (c) => {
    const orgId = c.get('orgId');
    const input = c.req.valid('json');
    const row = await updateImportDraftRow(orgId, c.req.param('id'), input);
    return c.json({ data: row });
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

importsRouter.get('/history', async (c) => {
  const orgId = c.get('orgId');
  const rows = await listImportHistory(orgId);
  return c.json({ data: rows });
});

importsRouter.get('/normalized-example.csv', (c) => {
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header(
    'Content-Disposition',
    'attachment; filename="ploutizo-normalized-import-example.csv"'
  );
  return c.body(getNormalizedImportExampleCsv());
});

export { importsRouter };
