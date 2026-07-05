import type { AppNavRoute } from '@/lib/navigation/types';
import type { LucideIcon } from 'lucide-react';

export type CommandContext = {
  close: () => void;
  navigate: (options: { to: AppNavRoute }) => void;
};

export type NavCommand = {
  type: 'nav';
  id: string;
  label: string;
  to: AppNavRoute;
  icon: LucideIcon;
  keywords?: readonly string[];
};

export type ActionCommand = {
  type: 'action';
  id: string;
  label: string;
  icon: LucideIcon;
  keywords?: readonly string[];
  run: (ctx: CommandContext) => void;
};

export type CommandDefinition = NavCommand | ActionCommand;

export type CommandGroupDefinition = {
  heading: string;
  commands: readonly CommandDefinition[];
};
