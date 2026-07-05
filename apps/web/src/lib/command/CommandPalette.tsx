import { useCallback } from 'react';
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

import { getCommandGroups, toRegisteredRoute } from '@/lib/navigation';
import type { CommandDefinition } from '@/lib/command/types';
import { useCommandPalette } from '@/lib/command/useCommandPalette';

export const CommandPalette = () => {
  const { open, setOpen } = useCommandPalette();
  const navigate = useNavigate();

  const close = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const runCommand = useCallback(
    (command: CommandDefinition) => {
      if (command.type === 'nav') {
        navigate({ to: toRegisteredRoute(command.to) });
      } else {
        command.run({
          close,
          navigate: (options) =>
            navigate({ to: toRegisteredRoute(options.to) }),
        });
      }
      close();
    },
    [close, navigate]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {getCommandGroups().map((group) => (
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
