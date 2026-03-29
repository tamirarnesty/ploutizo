import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start"
import { useEffect } from "react"
import appCss from "@ploutizo/ui/globals.css?url"
import { setTokenGetter } from "../lib/queryClient.js"

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
      <ClerkProvider>
        <TokenInitializer />
        {children}
      </ClerkProvider>
      <Scripts />
    </body>
  </html>
)

export const Route = createRootRoute({
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
