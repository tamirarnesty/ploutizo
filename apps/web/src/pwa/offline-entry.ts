import { offlineDeniedPathPatterns } from './offline-navigation-policy';

export const OFFLINE_ENTRY_PATH = '/offline.html';

export const allowsOfflineEntry = (pathname: string) =>
  !offlineDeniedPathPatterns.some((pattern) => pattern.test(pathname));
