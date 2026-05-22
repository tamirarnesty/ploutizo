import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readSessionPref,
  subscribeSessionPref,
  writeSessionPref,
} from './sessionPref';

const createStorageMock = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
};

describe('sessionPref', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', createStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('readSessionPref returns null for empty or invalid values', () => {
    expect(readSessionPref('ploutizo:transactions:last-visible-rows')).toBe(
      null
    );
    sessionStorage.setItem('ploutizo:transactions:last-visible-rows', '0');
    expect(readSessionPref('ploutizo:transactions:last-visible-rows')).toBe(
      null
    );
  });

  it('writeSessionPref and readSessionPref round-trip positive integers', () => {
    writeSessionPref('ploutizo:transactions:last-visible-rows', 7);
    expect(readSessionPref('ploutizo:transactions:last-visible-rows')).toBe(7);
  });

  it('subscribeSessionPref notifies on same-tab writes', () => {
    const listener = vi.fn();
    const key = 'ploutizo:accounts:last-visible-rows';
    subscribeSessionPref(key, listener);

    writeSessionPref(key, 3);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
