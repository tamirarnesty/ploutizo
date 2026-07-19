interface Identified {
  id: string;
}

interface NamedEntity extends Identified {
  name: string;
}

interface OrgMemberLike extends Identified {
  displayName: string;
}

export interface ImportCsvHints {
  csvCategoryName: string | null;
  csvAssigneeName: string | null;
  csvTagNames: string[];
}

export interface ResolvedImportReferences {
  reviewCategoryId: string | null;
  reviewTagIds: string[];
  reviewAssigneeMemberIds: string[];
}

export interface ImportReferenceCatalogs {
  categories: NamedEntity[];
  tags: NamedEntity[];
  members: OrgMemberLike[];
}

const normalizeName = (value: string) => value.trim().toLowerCase();

const indexByNormalizedName = <T extends Identified>(
  entities: T[],
  getName: (entity: T) => string
): Map<string, string> => {
  const index = new Map<string, string>();
  for (const entity of entities) {
    const key = normalizeName(getName(entity));
    if (!key || index.has(key)) continue;
    index.set(key, entity.id);
  }
  return index;
};

const matchIdByName = (
  name: string | null | undefined,
  index: Map<string, string>
): string | null => {
  if (!name?.trim()) return null;
  return index.get(normalizeName(name)) ?? null;
};

export const createImportReferenceResolver = (
  catalogs: ImportReferenceCatalogs
) => {
  const categoriesByName = indexByNormalizedName(
    catalogs.categories,
    (category) => category.name
  );
  const tagsByName = indexByNormalizedName(catalogs.tags, (tag) => tag.name);
  const membersByName = indexByNormalizedName(
    catalogs.members,
    (member) => member.displayName
  );

  return (hints: ImportCsvHints): ResolvedImportReferences => {
    const memberId = matchIdByName(hints.csvAssigneeName, membersByName);
    const reviewTagIds = [
      ...new Set(
        hints.csvTagNames
          .map((name) => matchIdByName(name, tagsByName))
          .filter((id): id is string => id !== null)
      ),
    ];

    return {
      reviewCategoryId: matchIdByName(hints.csvCategoryName, categoriesByName),
      reviewTagIds,
      reviewAssigneeMemberIds: memberId ? [memberId] : [],
    };
  };
};
