import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { Await } from '@tanstack/react-router';
import { hydrateStart } from '@tanstack/react-start/client';
import { AccessRouterRoot } from './app/AccessRouterRoot';
import { registerServiceWorker } from './pwa/register-service-worker';

registerServiceWorker();

const hydrationPromise = hydrateStart();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <Await promise={hydrationPromise}>
        {(router) => <AccessRouterRoot router={router} />}
      </Await>
    </StrictMode>
  );
});
