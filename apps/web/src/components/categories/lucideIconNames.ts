import { iconNames } from 'lucide-react/dynamic';
import type { IconName } from 'lucide-react/dynamic';

const KEBAB_ICON_NAMES = new Set<string>(iconNames);

export const pascalToKebab = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
    .toLowerCase();

export const kebabToPascal = (name: string): string =>
  name
    .split('-')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join('');

export const toLucideIconName = (kebabName: string): IconName | null =>
  KEBAB_ICON_NAMES.has(kebabName) ? (kebabName as IconName) : null;

export const isKnownLucideIcon = (pascalName: string): boolean =>
  KEBAB_ICON_NAMES.has(pascalToKebab(pascalName));

export const isKnownLucideKebabIcon = (kebabName: string): boolean =>
  KEBAB_ICON_NAMES.has(kebabName);

export const filterLucideKebabIconNames = (query: string): IconName[] => {
  const trimmed = query.trim();
  if (!trimmed) return iconNames;

  const needle = trimmed.toLowerCase();
  return iconNames.filter(
    (name) =>
      name.includes(needle) ||
      kebabToPascal(name).toLowerCase().includes(needle)
  );
};
