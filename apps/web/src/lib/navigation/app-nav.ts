import {
  CreditCard,
  FileUp,
  LayoutDashboard,
  Settings,
  Wallet,
} from 'lucide-react';

import type { CommandGroupDefinition, NavCommand } from '@/lib/command/types';
import type {
  SidebarNavItem,
  SidebarSettingsNavItem,
} from '@/lib/navigation/types';

export const sidebarPrimaryNav: readonly SidebarNavItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Transactions',
    to: '/transactions',
    icon: Wallet,
    children: [
      {
        label: 'Import',
        to: '/transactions/import',
        icon: FileUp,
      },
    ],
  },
  {
    label: 'Accounts',
    to: '/accounts',
    icon: CreditCard,
  },
];

export const sidebarSettingsNav = {
  label: 'Settings',
  to: '/settings',
  icon: Settings,
} as const satisfies SidebarSettingsNavItem;

const navigationCommands = [
  {
    type: 'nav',
    id: 'nav-dashboard',
    label: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
    keywords: ['home', 'overview'],
  },
  {
    type: 'nav',
    id: 'nav-transactions',
    label: 'Transactions',
    to: '/transactions',
    icon: Wallet,
    keywords: ['tx', 'list'],
  },
  {
    type: 'nav',
    id: 'nav-import-transactions',
    label: 'Import transactions',
    to: '/transactions/import',
    icon: FileUp,
    keywords: ['import', 'upload', 'csv', 'file'],
  },
  {
    type: 'nav',
    id: 'nav-accounts',
    label: 'Accounts',
    to: '/accounts',
    icon: CreditCard,
    keywords: ['cards', 'credit'],
  },
  {
    type: 'nav',
    id: 'nav-settings',
    label: 'Settings',
    to: '/settings',
    icon: Settings,
    keywords: ['preferences', 'theme'],
  },
] as const satisfies readonly NavCommand[];

/** Command palette groups. Actions group will be appended here in a future pass. */
export const commandGroups = [
  {
    heading: 'Navigation',
    commands: navigationCommands,
  },
] as const satisfies readonly CommandGroupDefinition[];

export const getCommandGroups = (): readonly CommandGroupDefinition[] =>
  commandGroups;

export const getNavigationCommands = (): readonly NavCommand[] =>
  navigationCommands;
