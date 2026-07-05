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
      className="align-middle"
      onClick={() => setOpen(true)}
    >
      <SearchIcon />
      <Kbd>{shortcutLabel}</Kbd>
    </Button>
  );
};
