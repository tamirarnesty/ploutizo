export const registerServiceWorker = () => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  // Updates stay waiting until the page posts SKIP_WAITING.
  void navigator.serviceWorker.register('/sw.js', { scope: '/' });
};
