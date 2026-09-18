import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { Await } from '@tanstack/react-router';
import { hydrateStart } from '@tanstack/react-start/client';
import { AccessRouterRoot } from './app/AccessRouterRoot';

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
