import { HeadContent, Scripts, createRootRoute, redirect } from "@tanstack/react-router"
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start"
import { auth } from "@clerk/tanstack-react-start/server"
import { shadcn } from "@clerk/ui/themes"
import { useEffect } from "react"
import { createServerFn } from "@tanstack/react-start"
import appCss from "@ploutizo/ui/globals.css?url"
import { setTokenGetter } from "../lib/queryClient.js"

const authGuard = createServerFn().handler(async () => {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    throw redirect({ to: "/sign-in" })
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
  <html lang="en">
    <head>
      <HeadContent />
    </head>
    <body>
      <ClerkProvider
        appearance={{ theme: shadcn }}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
      >
        <TokenInitializer />
        {children}
      </ClerkProvider>
      <Scripts />
    </body>
  </html>
)

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const isAuthRoute = location.pathname.startsWith("/sign-in") ||
      location.pathname.startsWith("/sign-up")
    if (!isAuthRoute) {
      await authGuard()
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
