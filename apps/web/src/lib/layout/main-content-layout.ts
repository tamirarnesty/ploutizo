export const MAIN_CONTENT_LAYOUT_DEFAULT = 'scroll' as const;

/** How the authenticated layout main area handles overflow. */
export type MainContentLayout = 'scroll' | 'viewport';

type RouteMatchWithLayout = {
  staticData?: {
    mainContentLayout?: MainContentLayout;
  };
};

/** Deepest route wins; defaults to page scroll for existing pages. */
export const resolveMainContentLayout = (
  matches: RouteMatchWithLayout[]
): MainContentLayout => {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const layout = matches[index]?.staticData?.mainContentLayout;
    if (layout) return layout;
  }

  return MAIN_CONTENT_LAYOUT_DEFAULT;
};

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    mainContentLayout?: MainContentLayout;
  }
}
