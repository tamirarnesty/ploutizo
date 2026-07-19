interface NamedEntity {
  id: string;
  name: string;
}

interface OrgMemberLike {
  id: string;
  displayName: string;
}

const normalizeName = (value: string) => value.trim().toLowerCase();

export const matchCategoryIdByName = (
  name: string | null | undefined,
  categories: NamedEntity[]
): string | null => {
  if (!name?.trim()) return null;
  const normalized = normalizeName(name);
  return (
    categories.find((category) => normalizeName(category.name) === normalized)
      ?.id ?? null
  );
};

export const matchTagIdsByNames = (
  names: string[],
  tags: NamedEntity[]
): string[] => {
  const matched = names
    .map((name) => matchCategoryIdByName(name, tags))
    .filter((id): id is string => id !== null);
  return [...new Set(matched)];
};

export const matchOrgMemberIdsByName = (
  name: string | null | undefined,
  members: OrgMemberLike[]
): string[] => {
  if (!name?.trim()) return [];
  const normalized = normalizeName(name);
  const exact = members.find(
    (member) => normalizeName(member.displayName) === normalized
  );
  return exact ? [exact.id] : [];
};
