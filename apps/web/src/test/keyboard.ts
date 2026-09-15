import { fireEvent } from '@testing-library/react';
import { detectPlatform } from '@tanstack/react-hotkeys';

export const fireModKey = (key: string, target: Element = document.body) => {
  const isMac = detectPlatform() === 'mac';
  fireEvent.keyDown(target, {
    key,
    metaKey: isMac,
    ctrlKey: !isMac,
  });
};
