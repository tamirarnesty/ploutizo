/// <reference types="vite/client" />

import { createRootRouteWithContext } from '@tanstack/react-router';
import appCss from '@ploutizo/ui/globals.css?url';
import { RootDocument } from '../app/RootDocument';
import { NotFound } from '../components/not-found/NotFound';
import { ErrorBoundary } from '../components/error-boundary/ErrorBoundary';
import type { RouterContext } from '../router';

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
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
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: ErrorBoundary,
});
