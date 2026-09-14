import { HOUSEHOLD_DEFAULT_CATEGORIES } from '@ploutizo/types';
import { describe, expect, it, vi } from 'vitest';
import { ensureFixtureCategories } from './fixtureCategories';
import type { CategoryRow, FixtureSeedApiClient } from './fixtureCategories';

const activeDefaults = (
  overrides: Partial<Record<string, Partial<CategoryRow>>> = {}
): CategoryRow[] =>
  HOUSEHOLD_DEFAULT_CATEGORIES.map((category, index) => ({
    id: `cat-${index}`,
    name: category.name,
    icon: category.icon,
    ...overrides[category.name],
  }));

type MockFixtureSeedApi = FixtureSeedApiClient & {
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const createMockApi = (
  handlers: Partial<{
    activeCategories: CategoryRow[];
    storedCategories: (CategoryRow & { archivedAt: string | null })[];
  }>
): MockFixtureSeedApi => {
  const activeCategories = handlers.activeCategories ?? activeDefaults();
  const storedCategories =
    handlers.storedCategories ??
    activeCategories.map((category) => ({
      ...category,
      archivedAt: null,
    }));

  const post = vi.fn(async (_path: string, json: unknown) => {
    const body = json as { name: string; icon: string };
    return {
      id: `new-${body.name}`,
      name: body.name,
      icon: body.icon,
    };
  });
  const patch = vi.fn(async (path: string, json?: unknown) => {
    const body = json as { icon?: string } | undefined;
    if (path.endsWith('/restore')) {
      const id = path.split('/')[3];
      const stored = storedCategories.find((category) => category.id === id);
      return {
        id,
        name: stored?.name ?? 'restored',
        icon: stored?.icon ?? null,
      };
    }
    if (path === '/api/categories/reorder') {
      return { ok: true };
    }
    const id = path.split('/').pop()!;
    const stored =
      storedCategories.find((category) => category.id === id) ??
      activeCategories.find((category) => category.id === id);
    return {
      id,
      name: stored?.name ?? 'updated',
      icon: body?.icon ?? stored?.icon ?? null,
    };
  });
  const del = vi.fn(async (_path: string) => ({}));
  const getData = vi.fn(async <T>(path: string): Promise<T> => {
    if (path === '/api/categories?includeArchived=true') {
      return storedCategories as T;
    }
    return activeCategories as T;
  });

  return {
    getData,
    post,
    patch,
    delete: del,
  } as MockFixtureSeedApi;
};

describe('ensureFixtureCategories', () => {
  it('returns active categories when the default catalog is already current', async () => {
    const categories = activeDefaults();
    const api = createMockApi({ activeCategories: categories });

    await expect(ensureFixtureCategories(api)).resolves.toEqual(
      HOUSEHOLD_DEFAULT_CATEGORIES.map((category, index) => ({
        id: `cat-${index}`,
        name: category.name,
        icon: category.icon,
      }))
    );
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('restores an archived default instead of posting a duplicate name', async () => {
    const archivedGroceries = {
      id: 'cat-archived-groceries',
      name: 'Groceries',
      icon: 'ShoppingCart',
      archivedAt: '2026-01-01T00:00:00.000Z',
    };
    const activeCategories = activeDefaults().filter(
      (category) => category.name !== 'Groceries'
    );
    const api = createMockApi({
      activeCategories,
      storedCategories: [
        ...activeCategories.map((category) => ({
          ...category,
          archivedAt: null,
        })),
        archivedGroceries,
      ],
    });

    await ensureFixtureCategories(api);

    expect(api.post).not.toHaveBeenCalledWith(
      '/api/categories',
      expect.objectContaining({ name: 'Groceries' })
    );
    expect(api.patch).toHaveBeenCalledWith(
      '/api/categories/cat-archived-groceries/restore'
    );
  });

  it('leaves custom categories untouched while syncing defaults', async () => {
    const customCategory = {
      id: 'cat-custom',
      name: 'Side Hustle',
      icon: 'Briefcase',
    };
    const categories = activeDefaults({
      Groceries: { icon: 'OldIcon' },
    });
    const api = createMockApi({
      activeCategories: [customCategory, ...categories],
    });

    await ensureFixtureCategories(api);

    expect(api.delete).not.toHaveBeenCalled();
    expect(api.patch).toHaveBeenCalledWith('/api/categories/cat-5', {
      icon: 'ShoppingCart',
    });
  });

  it('returns early when defaults are current even with custom categories', async () => {
    const customCategory = {
      id: 'cat-custom',
      name: 'Side Hustle',
      icon: 'Briefcase',
    };
    const categories = activeDefaults();
    const api = createMockApi({
      activeCategories: [customCategory, ...categories],
    });

    await expect(ensureFixtureCategories(api)).resolves.toEqual([
      customCategory,
      ...HOUSEHOLD_DEFAULT_CATEGORIES.map((category, index) => ({
        id: `cat-${index}`,
        name: category.name,
        icon: category.icon,
      })),
    ]);
    expect(api.delete).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('reorders defaults then preserved custom categories so sortOrder cannot collide', async () => {
    const customA = {
      id: 'cat-custom-a',
      name: 'Side Hustle',
      icon: 'Briefcase',
    };
    const customB = { id: 'cat-custom-b', name: 'Pet Care', icon: 'PawPrint' };
    const defaults = activeDefaults({ Groceries: { icon: 'OldIcon' } });
    const api = createMockApi({
      activeCategories: [customB, ...defaults, customA],
    });

    await ensureFixtureCategories(api);

    expect(api.patch).toHaveBeenCalledWith('/api/categories/reorder', {
      orderedIds: [
        ...defaults.map((category) => category.id),
        customB.id,
        customA.id,
      ],
    });
  });

  it('patches stale icons on active default categories', async () => {
    const groceriesIndex = HOUSEHOLD_DEFAULT_CATEGORIES.findIndex(
      (category) => category.name === 'Groceries'
    );
    const categories = activeDefaults({
      Groceries: { icon: 'OldIcon' },
    });
    const api = createMockApi({ activeCategories: categories });

    await ensureFixtureCategories(api);

    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).toHaveBeenCalledWith(
      `/api/categories/cat-${groceriesIndex}`,
      { icon: 'ShoppingCart' }
    );
  });
});
