export const isMacPlatform = () =>
  navigator.platform.toUpperCase().includes('MAC');

export const getCommandPaletteShortcutLabel = () =>
  isMacPlatform() ? '⌘K' : 'Ctrl+K';
