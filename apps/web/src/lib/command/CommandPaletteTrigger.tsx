import { useEffect, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import { Kbd } from '@ploutizo/ui/components/kbd';

import { useCommandPalette } from '@/lib/command/useCommandPalette';

export const CommandPaletteTrigger = () => {
  const { setOpen } = useCommandPalette();
  const [shortcutLabel, setShortcutLabel] = useState('Ctrl+K');

  useEffect(() => {
    setShortcutLabel(
      navigator.platform.toUpperCase().includes('MAC') ? '⌘K' : 'Ctrl+K'
    );
  }, []);

  return (
    <Button
      variant="outline"
      aria-label="Open command palette"
      className="w-full justify-between group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!"
      onClick={() => setOpen(true)}
    >
      <SearchIcon />
      <span className="flex-1 text-left group-data-[collapsible=icon]:hidden">
        Search
      </span>
      <Kbd className="group-data-[collapsible=icon]:hidden">
        {shortcutLabel}
      </Kbd>
    </Button>
  );
};
