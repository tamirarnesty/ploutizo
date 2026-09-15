import { Hono } from 'hono';
import {
  createCategorySchema,
  reorderSchema,
  updateCategorySchema,
} from '@ploutizo/validators';
import { appValidator } from '../lib/validator';
import {
  archiveCategoryById,
  createCategory,
  listCategories,
  reorderCategories,
  restoreCategoryById,
  updateCategory,
} from '../services/categories';
import type { AppEnv } from '../types';

const categoriesRouter = new Hono<AppEnv>();

// IMPORTANT: /reorder must be registered BEFORE /:id to prevent ':id' capturing 'reorder'
categoriesRouter.patch(
  '/reorder',
  appValidator('json', reorderSchema),
  async (c) => {
    const orgId = c.get('principal').activeHouseholdId;
    const { orderedIds } = c.req.valid('json');
    await reorderCategories(orgId, orderedIds);
    return c.json({ data: { ok: true } });
  }
);

categoriesRouter.get('/', async (c) => {
  const orgId = c.get('principal').activeHouseholdId;
  const includeArchived = c.req.query('includeArchived') === 'true';
  const rows = await listCategories(orgId, { includeArchived });
  return c.json({ data: rows });
});

categoriesRouter.post(
  '/',
  appValidator('json', createCategorySchema),
  async (c) => {
    const orgId = c.get('principal').activeHouseholdId;
    const data = c.req.valid('json');
    const row = await createCategory(orgId, data);
    return c.json({ data: row }, 201);
  }
);

categoriesRouter.patch('/:id/restore', async (c) => {
  const orgId = c.get('principal').activeHouseholdId;
  const id = c.req.param('id');
  const restored = await restoreCategoryById(id, orgId);
  return c.json({ data: restored });
});

categoriesRouter.patch(
  '/:id',
  appValidator('json', updateCategorySchema),
  async (c) => {
    const orgId = c.get('principal').activeHouseholdId;
    const id = c.req.param('id');
    const data = c.req.valid('json');
    const updated = await updateCategory(id, orgId, data);
    return c.json({ data: updated });
  }
);

categoriesRouter.delete('/:id/archive', async (c) => {
  const orgId = c.get('principal').activeHouseholdId;
  const id = c.req.param('id');
  const updated = await archiveCategoryById(id, orgId);
  return c.json({ data: updated });
});

export { categoriesRouter };
