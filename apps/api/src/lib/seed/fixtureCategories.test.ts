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
    sortOrder: index,
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
    const body = json as { name: string; icon: string; sortOrder: number };
    return {
      id: `new-${body.name}`,
      name: body.name,
      icon: body.icon,
      sortOrder: body.sortOrder,
    };
  });
  const patch = vi.fn(async (path: string) => {
    if (!path.endsWith('/restore')) {
      throw new Error(`Unexpected PATCH ${path}`);
    }
    const id = path.split('/')[3];
    const stored = storedCategories.find((category) => category.id === id);
    return {
      id,
      name: stored?.name ?? 'restored',
      icon: stored?.icon ?? null,
      sortOrder: stored?.sortOrder ?? 0,
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

const postedCategories = (api: MockFixtureSeedApi) =>
  api.post.mock.calls
    .filter(([path]) => path === '/api/categories')
    .map(([, json]) => json as { name: string; sortOrder: number });

describe('ensureFixtureCategories', () => {
  it('returns active categories when every default name is already present', async () => {
    const customCategory = {
      id: 'cat-custom',
      name: 'Side Hustle',
      icon: 'Briefcase',
      sortOrder: 0,
    };
    const categories = [
      customCategory,
      ...activeDefaults({ Groceries: { icon: 'OldIcon' } }),
    ];
    const api = createMockApi({ activeCategories: categories });

    await expect(ensureFixtureCategories(api)).resolves.toEqual(categories);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('appends missing defaults after existing sortOrder without reordering', async () => {
    const existing = [
      {
        id: 'old-groceries',
        name: 'Groceries',
        icon: 'ShoppingCart',
        sortOrder: 0,
      },
      {
        id: 'old-dining',
        name: 'Dining & Restaurants',
        icon: 'UtensilsCrossed',
        sortOrder: 2,
      },
    ];
    const api = createMockApi({ activeCategories: existing });

    const result = await ensureFixtureCategories(api);
    const posted = postedCategories(api);

    expect(posted.map((category) => category.name)).toEqual(
      HOUSEHOLD_DEFAULT_CATEGORIES.filter(
        (category) => category.name !== 'Groceries'
      ).map((category) => category.name)
    );
    expect(posted.map((category) => category.sortOrder)).toEqual(
      posted.map((_, index) => 3 + index)
    );
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
    expect(result.map((category) => category.id)).toEqual([
      'old-groceries',
      'old-dining',
      ...posted.map((category) => `new-${category.name}`),
    ]);
  });

  it('restores an archived default instead of posting a duplicate name', async () => {
    const archivedGroceries = {
      id: 'cat-archived-groceries',
      name: 'Groceries',
      icon: 'OldIcon',
      sortOrder: 5,
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
    expect(api.patch).not.toHaveBeenCalledWith(
      '/api/categories/cat-archived-groceries',
      expect.anything()
    );
  });
});
