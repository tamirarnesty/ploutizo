import type { AppNavRoute } from '@/lib/navigation/types';
import type { LucideIcon } from 'lucide-react';

export type NavCommand = {
  type: 'nav';
  id: string;
  label: string;
  to: AppNavRoute;
  icon: LucideIcon;
  keywords?: readonly string[];
};

export type ImportDraftCommand = {
  type: 'import-draft';
  id: string;
  label: string;
  draftId: string;
  icon: LucideIcon;
  keywords?: readonly string[];
};

export type CommandDefinition = NavCommand | ImportDraftCommand;

export type CommandGroupDefinition = {
  heading: string;
  commands: readonly CommandDefinition[];
};
