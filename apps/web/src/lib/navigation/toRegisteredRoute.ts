import type { FileRouteTypes } from '../../routeTree.gen';

import type { AppNavRoute } from './types';

type RegisteredRoute = FileRouteTypes['to'];

/** App nav may reference routes landing in a follow-up PR (e.g. PLO-30 import). */
export const toRegisteredRoute = (to: AppNavRoute) => to as RegisteredRoute;
