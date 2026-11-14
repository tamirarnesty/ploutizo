/// <reference types="vite/client" />

import { createRootRouteWithContext } from '@tanstack/react-router';
import appCss from '@ploutizo/ui/globals.css?url';
import { RootDocument } from '../app/RootDocument';
import { NotFound } from '../components/not-found/NotFound';
import { ErrorBoundary } from '../components/error-boundary/ErrorBoundary';
import { installLinks, installMeta } from '../pwa/install-document';
import type { RouterContext } from '../router';

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      ...installMeta,
      {
        name: 'color-scheme',
        content: 'light dark',
      },
      {
        title: 'ploutizo',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      ...installLinks,
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: ErrorBoundary,
});
