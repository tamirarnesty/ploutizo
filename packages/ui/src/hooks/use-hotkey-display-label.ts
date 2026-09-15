import { useEffect, useState } from 'react';
import {
  type RegisterableHotkey,
  formatForDisplay,
} from '@tanstack/react-hotkeys';

export const useHotkeyDisplayLabel = (hotkey: RegisterableHotkey) => {
  const [label, setLabel] = useState(() =>
    formatForDisplay(hotkey, { platform: 'linux' })
  );

  useEffect(() => {
    setLabel(formatForDisplay(hotkey));
  }, [hotkey]);

  return label;
};
