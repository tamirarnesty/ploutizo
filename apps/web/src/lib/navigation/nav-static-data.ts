export type NavGroup = 'navigation' | 'settings';

export type NavPlacement = 'primary' | 'footer';

export type RouteNavStaticData = {
  label: string;
  keywords?: readonly string[];
  group?: NavGroup;
  order?: number;
  sidebar?: boolean;
  searchable?: boolean;
  placement?: NavPlacement;
};
