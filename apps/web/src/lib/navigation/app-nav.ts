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

import { formatAccountLabel } from '@ploutizo/utils';
import type { ImportDraftSummary } from '@ploutizo/types';
import type { CommandGroupDefinition, NavCommand } from '@/lib/command/types';
import type { SidebarNavItem } from '@/lib/navigation/types';

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
      {
        label: 'Import History',
        to: '/transactions/import/history',
        icon: History,
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
  children: [
    {
      label: 'Categories & Tags',
      to: '/settings/categories',
      icon: Tags,
    },
    {
      label: 'Merchant Rules',
      to: '/settings/merchant-rules',
      icon: WandSparkles,
    },
    {
      label: 'Household',
      to: '/settings/household',
      icon: Users,
    },
  ],
} as const satisfies SidebarNavItem;

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
    id: 'nav-import-history',
    label: 'Import History',
    to: '/transactions/import/history',
    icon: History,
    keywords: ['import', 'history', 'uploads'],
  },
  {
    type: 'nav',
    id: 'nav-accounts',
    label: 'Accounts',
    to: '/accounts',
    icon: CreditCard,
    keywords: ['cards', 'credit'],
  },
] as const satisfies readonly NavCommand[];

const settingsCommands = [
  {
    type: 'nav',
    id: 'nav-settings',
    label: 'Settings',
    to: '/settings',
    icon: Settings,
    keywords: ['preferences', 'theme'],
  },
  {
    type: 'nav',
    id: 'nav-settings-categories',
    label: 'Categories & Tags',
    to: '/settings/categories',
    icon: Tags,
    keywords: ['settings', 'categories', 'tags'],
  },
  {
    type: 'nav',
    id: 'nav-settings-merchant-rules',
    label: 'Merchant Rules',
    to: '/settings/merchant-rules',
    icon: WandSparkles,
    keywords: ['settings', 'merchant', 'rules'],
  },
  {
    type: 'nav',
    id: 'nav-settings-household',
    label: 'Household',
    to: '/settings/household',
    icon: Users,
    keywords: ['settings', 'members', 'household'],
  },
] as const satisfies readonly NavCommand[];

const staticCommandGroups = [
  {
    heading: 'Navigation',
    commands: navigationCommands,
  },
  {
    heading: 'Settings',
    commands: settingsCommands,
  },
] as const satisfies readonly CommandGroupDefinition[];

export const getCommandGroups = (
  drafts: readonly ImportDraftSummary[] = []
): readonly CommandGroupDefinition[] => {
  if (drafts.length === 0) return staticCommandGroups;

  return [
    ...staticCommandGroups,
    {
      heading: 'Continue Import',
      commands: drafts.map((draft) => ({
        type: 'import-draft' as const,
        id: `import-draft-${draft.id}`,
        label: `${formatAccountLabel(draft.account)} — ${
          draft.fileName ?? 'Untitled CSV'
        }`,
        draftId: draft.id,
        icon: FileUp,
        keywords: [
          'continue',
          'draft',
          formatAccountLabel(draft.account),
          draft.fileName ?? '',
        ],
      })),
    },
  ];
};

export const getNavigationCommands = (): readonly NavCommand[] =>
  navigationCommands;
