export const assertBrowserPersistenceRuntime = (isServer: boolean) => {
  if (isServer) {
    throw new Error('Browser persistence opens only in the browser');
  }
};
