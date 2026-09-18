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

import type { AppNavRoute } from '@/lib/navigation/types';
import type { LucideIcon } from 'lucide-react';

export const navIcons = {
  '/dashboard': LayoutDashboard,
  '/transactions': Wallet,
  '/import': FileUp,
  '/import/history': History,
  '/accounts': CreditCard,
  '/settings': Settings,
  '/settings/categories': Tags,
  '/settings/merchant-rules': WandSparkles,
  '/settings/household': Users,
} as const satisfies Record<AppNavRoute, LucideIcon>;

export const resolveNavIcon = (to: AppNavRoute): LucideIcon => navIcons[to];
