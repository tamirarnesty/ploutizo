import { Hono } from 'hono';
import { createTagSchema } from '@ploutizo/validators';
import { appValidator } from '../lib/validator';
import { archiveTagById, createTag, listTags } from '../services/tags';
import type { AppEnv } from '../types';

const tagsRouter = new Hono<AppEnv>();

tagsRouter.get('/', async (c) => {
  const orgId = c.get('orgId');
  const rows = await listTags(orgId);
  return c.json({ data: rows });
});

tagsRouter.post('/', appValidator('json', createTagSchema), async (c) => {
  const orgId = c.get('orgId');
  const data = c.req.valid('json');
  const row = await createTag(orgId, data);
  return c.json({ data: row }, 201);
});

tagsRouter.delete('/:id/archive', async (c) => {
  const orgId = c.get('orgId');
  const id = c.req.param('id');
  const updated = await archiveTagById(id, orgId);
  return c.json({ data: updated });
});

export { tagsRouter };
