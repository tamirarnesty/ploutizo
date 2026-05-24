const listenersByKey = new Map<string, Set<() => void>>();
let storageListenerAttached = false;

const notify = (key: string) => {
  listenersByKey.get(key)?.forEach((listener) => listener());
};

const attachStorageListener = () => {
  if (storageListenerAttached || typeof window === 'undefined') return;
  window.addEventListener('storage', (event) => {
    if (event.key !== null) {
      notify(event.key);
    }
  });
  storageListenerAttached = true;
};

export const readSessionPref = (key: string): number | null => {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(key);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const writeSessionPref = (key: string, value: number): void => {
  if (typeof window === 'undefined') return;
  if (!Number.isFinite(value) || value <= 0) return;

  const serialized = String(value);
  if (sessionStorage.getItem(key) === serialized) return;
  sessionStorage.setItem(key, serialized);
  notify(key);
};

export const subscribeSessionPref = (
  key: string,
  onChange: () => void
): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  attachStorageListener();
  let keyListeners = listenersByKey.get(key);
  if (!keyListeners) {
    keyListeners = new Set();
    listenersByKey.set(key, keyListeners);
  }
  keyListeners.add(onChange);

  return () => keyListeners.delete(onChange);
};
