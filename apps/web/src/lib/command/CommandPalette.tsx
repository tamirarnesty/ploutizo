import { useCallback, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@ploutizo/ui/components/command';

import type { CommandDefinition } from '@/lib/command/types';
import { getCommandGroups } from '@/lib/command/getCommandGroups';
import { useCommandPalette } from '@/lib/command/useCommandPalette';
import { useGetImportDrafts } from '@/lib/data-access/imports';
import { importDraftReviewRoute } from '@/lib/navigation';

export const CommandPalette = () => {
  const { open, setOpen } = useCommandPalette();
  const navigate = useNavigate();
  const draftsQuery = useGetImportDrafts({ enabled: open });
  const drafts = draftsQuery.data ?? [];
  const commandGroups = useMemo(() => getCommandGroups(drafts), [drafts]);

  const runCommand = useCallback(
    (command: CommandDefinition) => {
      if (command.type === 'nav') {
        navigate({ to: command.to });
      } else {
        navigate(importDraftReviewRoute(command.draftId));
      }
      setOpen(false);
    },
    [navigate, setOpen]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {commandGroups.map((group) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.commands.map((command) => {
                const Icon = command.icon;
                return (
                  <CommandItem
                    key={command.id}
                    value={command.label}
                    keywords={
                      command.keywords ? [...command.keywords] : undefined
                    }
                    onSelect={() => runCommand(command)}
                  >
                    <Icon />
                    <span>{command.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
};
