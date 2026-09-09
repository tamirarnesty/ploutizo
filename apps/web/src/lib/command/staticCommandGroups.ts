import { sidebarPrimaryNav, sidebarSettingsNav } from '@/lib/navigation';
import type { SidebarNavItem } from '@/lib/navigation/types';
import type { CommandGroupDefinition, NavCommand } from '@/lib/command/types';

type NavDestination = Pick<
  SidebarNavItem,
  'label' | 'to' | 'icon' | 'keywords'
>;

const toNavCommand = ({
  label,
  to,
  icon,
  keywords,
}: NavDestination): NavCommand => ({
  type: 'nav',
  id: `nav-${to.slice(1).replaceAll('/', '-')}`,
  label,
  to,
  icon,
  keywords,
});

const flattenNavItem = (item: SidebarNavItem): NavCommand[] => [
  toNavCommand(item),
  ...(item.children ?? []).map(toNavCommand),
];

export const staticCommandGroups = [
  {
    heading: 'Navigation',
    commands: sidebarPrimaryNav.flatMap(flattenNavItem),
  },
  {
    heading: 'Settings',
    commands: flattenNavItem(sidebarSettingsNav),
  },
] as const satisfies readonly CommandGroupDefinition[];
