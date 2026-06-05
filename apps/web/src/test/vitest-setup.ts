import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { alertDialogMock, dialogMock, sheetMock } from '@/test/mockUiOverlays';

vi.mock('@ploutizo/ui/components/dialog', () => dialogMock);
vi.mock('@ploutizo/ui/components/sheet', () => sheetMock);
vi.mock('@ploutizo/ui/components/alert-dialog', () => alertDialogMock);

afterEach(() => cleanup());

/** Base UI portals / menus rely on layout observers in browsers. */
if (typeof ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver;
}
