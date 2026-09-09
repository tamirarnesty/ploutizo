import {
  CreditCard,
  FileUp,
  History,
  LayoutDashboard,
  Settings,
  Tags,
  Users,
  Wallet,
  WandSparkles,
} from 'lucide-react';

import type { CommandGroupDefinition, NavCommand } from '@/lib/command/types';
import type { SidebarNavChild, SidebarNavItem } from '@/lib/navigation/types';

export const sidebarPrimaryNav: readonly SidebarNavItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
    keywords: ['home', 'overview'],
  },
  {
    label: 'Transactions',
    to: '/transactions',
    icon: Wallet,
    keywords: ['tx', 'list'],
  },
  {
    label: 'Import',
    to: '/import',
    icon: FileUp,
    keywords: ['import', 'upload', 'csv', 'file'],
    children: [
      {
        label: 'Import History',
        to: '/import/history',
        icon: History,
        keywords: ['import', 'history', 'uploads'],
      },
    ],
  },
  {
    label: 'Accounts',
    to: '/accounts',
    icon: CreditCard,
    keywords: ['cards', 'credit'],
  },
];

export const sidebarSettingsNav = {
  label: 'Settings',
  to: '/settings',
  icon: Settings,
  keywords: ['preferences', 'theme'],
  children: [
    {
      label: 'Categories & Tags',
      to: '/settings/categories',
      icon: Tags,
      keywords: ['settings', 'categories', 'tags'],
    },
    {
      label: 'Merchant Rules',
      to: '/settings/merchant-rules',
      icon: WandSparkles,
      keywords: ['settings', 'merchant', 'rules'],
    },
    {
      label: 'Household',
      to: '/settings/household',
      icon: Users,
      keywords: ['settings', 'members', 'household'],
    },
  ],
} as const satisfies SidebarNavItem;

const toNavCommand = ({
  label,
  to,
  icon,
  keywords,
}: SidebarNavChild): NavCommand => ({
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
