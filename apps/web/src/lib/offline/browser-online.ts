const listeners = new Set<() => void>();

let onlineOverride: boolean | null = null;

const emit = () => {
  for (const listener of listeners) {
    listener();
  }
};

/** Browser network status. SSR is treated as online; the database never opens there. */
export const isBrowserOffline = () => {
  if (import.meta.env.SSR) return false;
  if (onlineOverride !== null) return !onlineOverride;
  return navigator.onLine === false;
};

export const subscribeBrowserOnline = (listener: () => void) => {
  listeners.add(listener);
  if (import.meta.env.SSR) {
    return () => {
      listeners.delete(listener);
    };
  }
  window.addEventListener('online', emit);
  window.addEventListener('offline', emit);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('online', emit);
    window.removeEventListener('offline', emit);
  };
};

export const getBrowserOfflineSnapshot = () => isBrowserOffline();

export const getBrowserOfflineServerSnapshot = () => false;

/** Tests pin the network. Pass null to follow navigator.onLine again. */
export const setBrowserOnlineForTests = (online: boolean | null) => {
  onlineOverride = online;
  emit();
};
