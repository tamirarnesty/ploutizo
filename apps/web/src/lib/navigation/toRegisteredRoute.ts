import type { FileRouteTypes } from '../../routeTree.gen';

import type { AppNavRoute } from './types';

type RegisteredRoute = FileRouteTypes['to'];

export const toRegisteredRoute = (to: AppNavRoute): RegisteredRoute => to;
