export const OFFLINE_ENTRY_PATH = '/offline.html';

const deniedOfflineEntryPatterns = [
  /^\/api(?:\/|$)/,
  /^\/_serverFn(?:\/|$)/,
  /^\/sign-in(?:\/|$)/,
  /^\/sign-up(?:\/|$)/,
  /^\/__clerk(?:\/|$)/,
  /^\/\.clerk(?:\/|$)/,
];

export const allowsOfflineEntry = (pathname: string) =>
  !deniedOfflineEntryPatterns.some((pattern) => pattern.test(pathname));
