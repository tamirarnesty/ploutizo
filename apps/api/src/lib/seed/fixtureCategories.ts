import { HOUSEHOLD_DEFAULT_CATEGORIES } from '@ploutizo/types';

export const FIXTURE_TRANSACTION_CATEGORY_NAMES = {
  groceries: 'Groceries',
  takeout: 'Takeout',
  drinks: 'Drinks & Treats',
  transport: 'Transport',
  bills: 'Bills',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  travel: 'Travel',
  health: 'Health & Wellbeing',
} as const;

export type FixtureTransactionCategoryKey =
  keyof typeof FIXTURE_TRANSACTION_CATEGORY_NAMES;

export type CategoryRow = {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
};

type StoredCategoryRow = CategoryRow & { archivedAt: string | null };

export type FixtureSeedApiClient = {
  getData: <T>(path: string) => Promise<T>;
  post: <T>(path: string, json: unknown) => Promise<T>;
  patch: <T>(path: string, json?: unknown) => Promise<T>;
  delete: <T>(path: string) => Promise<T>;
};

const categoryByName = (categories: CategoryRow[], name: string): string => {
  const row = categories.find((category) => category.name === name);
  if (!row) {
    throw new Error(
      `Seeded category "${name}" was not returned by GET /api/categories`
    );
  }
  return row.id;
};

export const fixtureCategoryId = (
  categories: CategoryRow[],
  key: FixtureTransactionCategoryKey
): string =>
  categoryByName(categories, FIXTURE_TRANSACTION_CATEGORY_NAMES[key]);

const nextSortOrder = (categories: CategoryRow[]): number =>
  Math.max(-1, ...categories.map((category) => category.sortOrder)) + 1;

export const ensureFixtureCategories = async (
  api: FixtureSeedApiClient,
  onLog: (message: string) => void = () => undefined
): Promise<CategoryRow[]> => {
  const categories = await api.getData<CategoryRow[]>('/api/categories');
  const activeNames = new Set(categories.map((category) => category.name));
  const missing = HOUSEHOLD_DEFAULT_CATEGORIES.filter(
    (category) => !activeNames.has(category.name)
  );
  if (missing.length === 0) return categories;

  onLog(
    'Fixture household is missing default categories; adding missing names'
  );

  const storedCategories = await api.getData<StoredCategoryRow[]>(
    '/api/categories?includeArchived=true'
  );
  const archivedByName = new Map(
    storedCategories
      .filter((category) => category.archivedAt !== null)
      .map((category) => [category.name, category])
  );
  let appendSortOrder = nextSortOrder(categories);
  const added = await Promise.all(
    missing.map((category) => {
      const archived = archivedByName.get(category.name);
      if (archived) {
        return api.patch<CategoryRow>(`/api/categories/${archived.id}/restore`);
      }
      const sortOrder = appendSortOrder;
      appendSortOrder += 1;
      return api.post<CategoryRow>('/api/categories', {
        name: category.name,
        icon: category.icon,
        sortOrder,
      });
    })
  );
  return [...categories, ...added];
};
