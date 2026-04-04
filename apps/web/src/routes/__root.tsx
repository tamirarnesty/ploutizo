import {
  HeadContent,
  Scripts,
  createRootRoute,
  redirect,
} from "@tanstack/react-router"
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start"
import { auth } from "@clerk/tanstack-react-start/server"
import { shadcn } from "@clerk/ui/themes"
import { QueryClientProvider } from "@tanstack/react-query"
import { useEffect } from "react"
import { createServerFn } from "@tanstack/react-start"
import appCss from "@ploutizo/ui/globals.css?url"
import { ThemeProvider } from "@ploutizo/ui/components/theme-provider"
import { TooltipProvider } from "@ploutizo/ui/components/tooltip"
import { queryClient, setTokenGetter } from "../lib/queryClient"

const authGuard = createServerFn().handler(async () => {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    throw redirect({ to: "/sign-in/$" })
  }
})

const orgGuard = createServerFn().handler(async () => {
  const { orgId } = await auth()
  if (!orgId) {
    throw redirect({ to: "/onboarding" })
  }
})

// TokenInitializer: wires Clerk's getToken into the React Query apiFetch helper.
// Must run inside ClerkProvider so useAuth() has access to the Clerk session.
// setTokenGetter must be called before any query fires — this component renders at app root.
const TokenInitializer = () => {
  const { getToken } = useAuth()
  useEffect(() => {
    setTokenGetter(() => getToken())
  }, [getToken])
  return null
}

const RootDocument = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" suppressHydrationWarning>
    <head>
      <HeadContent />
    </head>
    <body>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="theme"
      >
        <TooltipProvider delayDuration={500}>
          <QueryClientProvider client={queryClient}>
            <ClerkProvider appearance={{ theme: shadcn }}>
              <TokenInitializer />
              {children}
            </ClerkProvider>
          </QueryClientProvider>
        </TooltipProvider>
      </ThemeProvider>
      <Scripts />
    </body>
  </html>
)

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const isAuthRoute =
      location.pathname.startsWith("/sign-in") ||
      location.pathname.startsWith("/sign-up")
    const isOnboarding = location.pathname === "/onboarding"
    if (!isAuthRoute) {
      await authGuard()
      if (!isOnboarding) {
        await orgGuard()
      }
    }
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "ploutizo",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})
