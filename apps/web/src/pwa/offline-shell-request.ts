/** Shell prerender only. A normal request cannot skip Clerk by sending the header. */
export const isPrerenderedOfflineShell = (request: Request) =>
  process.env['TSS_PRERENDERING'] === 'true' &&
  request.headers.get('x-tss_shell') === 'true';
