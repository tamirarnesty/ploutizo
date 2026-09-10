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

import type { SidebarNavItem } from '@/lib/navigation/types';

export const sidebarPrimaryNav = [
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
] as const satisfies readonly SidebarNavItem[];

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
