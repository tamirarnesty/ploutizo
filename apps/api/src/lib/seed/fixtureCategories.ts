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
};

type StoredCategoryRow = CategoryRow & { archivedAt: string | null };

export type FixtureSeedApiClient = {
  getData: <T>(path: string) => Promise<T>;
  post: <T>(path: string, json: unknown) => Promise<T>;
  patch: <T>(path: string, json?: unknown) => Promise<T>;
  delete: <T>(path: string) => Promise<T>;
};

const HOUSEHOLD_DEFAULT_CATEGORY_NAMES = new Set(
  HOUSEHOLD_DEFAULT_CATEGORIES.map((category) => category.name)
);

const HOUSEHOLD_DEFAULT_CATEGORY_BY_NAME = new Map(
  HOUSEHOLD_DEFAULT_CATEGORIES.map((category) => [category.name, category])
);

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

export const isDefaultCategoryCatalogCurrent = (
  categories: CategoryRow[]
): boolean => {
  if (
    categories.some(
      (category) => !HOUSEHOLD_DEFAULT_CATEGORY_NAMES.has(category.name)
    )
  ) {
    return false;
  }

  const orderedDefaultIds = HOUSEHOLD_DEFAULT_CATEGORIES.flatMap((category) => {
    const row = categories.find(
      (candidate) => candidate.name === category.name
    );
    return row ? [row.id] : [];
  });
  if (orderedDefaultIds.length !== HOUSEHOLD_DEFAULT_CATEGORIES.length) {
    return false;
  }

  if (
    !categories.every(
      (category, index) => category.id === orderedDefaultIds[index]
    )
  ) {
    return false;
  }

  return categories.every((category) => {
    const catalog = HOUSEHOLD_DEFAULT_CATEGORY_BY_NAME.get(category.name);
    return catalog?.icon === category.icon;
  });
};

const syncCategoryIcons = async (
  api: FixtureSeedApiClient,
  categories: CategoryRow[]
): Promise<CategoryRow[]> =>
  Promise.all(
    categories.map(async (category) => {
      const catalog = HOUSEHOLD_DEFAULT_CATEGORY_BY_NAME.get(category.name);
      if (!catalog || category.icon === catalog.icon) return category;
      return api.patch<CategoryRow>(`/api/categories/${category.id}`, {
        icon: catalog.icon,
      });
    })
  );

export const ensureFixtureCategories = async (
  api: FixtureSeedApiClient,
  onLog: (message: string) => void = () => undefined
): Promise<CategoryRow[]> => {
  let categories = await api.getData<CategoryRow[]>('/api/categories');
  if (isDefaultCategoryCatalogCurrent(categories)) return categories;

  onLog(
    'Fixture household categories are out of date; syncing to current defaults'
  );

  await Promise.all(
    categories
      .filter(
        (category) => !HOUSEHOLD_DEFAULT_CATEGORY_NAMES.has(category.name)
      )
      .map((category) => api.delete(`/api/categories/${category.id}/archive`))
  );

  categories = categories.filter((category) =>
    HOUSEHOLD_DEFAULT_CATEGORY_NAMES.has(category.name)
  );
  const activeNames = new Set(categories.map((category) => category.name));
  const storedCategories = await api.getData<StoredCategoryRow[]>(
    '/api/categories?includeArchived=true'
  );
  const archivedByName = new Map(
    storedCategories
      .filter((category) => category.archivedAt !== null)
      .map((category) => [category.name, category])
  );
  const upserted = await Promise.all(
    HOUSEHOLD_DEFAULT_CATEGORIES.flatMap((category, sortOrder) => {
      if (activeNames.has(category.name)) return [];
      const archived = archivedByName.get(category.name);
      if (archived) {
        return [
          api
            .patch<CategoryRow>(`/api/categories/${archived.id}/restore`)
            .then((restored) =>
              api.patch<CategoryRow>(`/api/categories/${restored.id}`, {
                icon: category.icon,
                sortOrder,
              })
            ),
        ];
      }
      return [
        api.post<CategoryRow>('/api/categories', {
          name: category.name,
          icon: category.icon,
          sortOrder,
        }),
      ];
    })
  );
  categories = await syncCategoryIcons(api, [...categories, ...upserted]);

  const categoryIdByName = new Map(
    categories.map((category) => [category.name, category.id])
  );
  const orderedIds = HOUSEHOLD_DEFAULT_CATEGORIES.map(
    (category) => categoryIdByName.get(category.name)!
  );
  await api.patch('/api/categories/reorder', { orderedIds });

  return HOUSEHOLD_DEFAULT_CATEGORIES.map((category) => ({
    id: categoryIdByName.get(category.name)!,
    name: category.name,
    icon: category.icon,
  }));
};
