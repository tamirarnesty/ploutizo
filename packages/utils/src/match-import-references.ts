interface Identified {
  id: string;
}

interface NamedEntity extends Identified {
  name: string;
}

interface OrgMemberLike extends Identified {
  displayName: string;
  firstName?: string | null;
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

const firstNameFromDisplayName = (displayName: string): string =>
  displayName.trim().split(/\s+/)[0] ?? '';

const indexMemberNames = (members: OrgMemberLike[]): Map<string, string[]> => {
  const index = new Map<string, string[]>();
  const add = (name: string | null | undefined, id: string) => {
    const key = normalizeName(name ?? '');
    if (!key) return;
    const ids = index.get(key) ?? [];
    if (!ids.includes(id)) ids.push(id);
    index.set(key, ids);
  };

  for (const member of members) {
    add(member.displayName, member.id);
    add(member.firstName, member.id);
    if (!member.firstName?.trim()) {
      add(firstNameFromDisplayName(member.displayName), member.id);
    }
  }

  return index;
};

const matchUniqueMemberId = (
  name: string | null | undefined,
  index: Map<string, string[]>
): string | null => {
  if (!name?.trim()) return null;
  const ids = index.get(normalizeName(name));
  return ids?.length === 1 ? (ids[0] ?? null) : null;
};

export const createImportReferenceResolver = (
  catalogs: ImportReferenceCatalogs
) => {
  const categoriesByName = indexByNormalizedName(
    catalogs.categories,
    (category) => category.name
  );
  const tagsByName = indexByNormalizedName(catalogs.tags, (tag) => tag.name);
  const membersByName = indexMemberNames(catalogs.members);

  return (hints: ImportCsvHints): ResolvedImportReferences => {
    const memberId = matchUniqueMemberId(hints.csvAssigneeName, membersByName);
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
