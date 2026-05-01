import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import type { ErrorComponentProps } from '@tanstack/react-router';

const ART_ERR = ` ███████╗██████╗ ██████╗
 ██╔════╝██╔══██╗██╔══██╗
 █████╗  ██████╔╝██████╔╝
 ██╔══╝  ██╔══██╗██╔══██╗
 ███████╗██║  ██║██║  ██║
 ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝`;

export const ErrorBoundary = ({ error, reset }: ErrorComponentProps) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg">
        {/* Status bar */}
        <div className="mb-8 flex items-center justify-between border-b border-border pb-3">
          <span className="font-mono text-xs tracking-widest text-muted-foreground">
            ● STATUS — ERROR
          </span>
          <span className="font-mono text-xs tracking-widest text-muted-foreground">
            ploutizo/~/error
          </span>
        </div>

        {/* Art block */}
        <pre className="mb-6 font-mono text-xs leading-[1.15] text-muted-foreground opacity-40 select-none">
          {ART_ERR}
        </pre>

        {/* Error label */}
        <p className="mb-6 font-mono text-xs tracking-widest text-muted-foreground">
          ERROR · 0x500
        </p>

        {/* Heading + subtext */}
        <div className="mb-8 space-y-2">
          <Text as="h1" variant="h1">
            Something went wrong
          </Text>
          <Text variant="body-sm" className="text-muted-foreground">
            An unexpected error occurred. Try again, or head back to the
            dashboard.
          </Text>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button onClick={reset}>Try again</Button>
          <Link to="/dashboard">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </div>

        {/* Dev-mode error detail — not rendered in production */}
        {import.meta.env.DEV && (
          <div className="mt-6 space-y-2">
            <p className="font-mono text-xs text-muted-foreground">
              {error.message}
            </p>
            <Button
              variant="link"
              className="h-auto p-0 font-mono text-xs text-muted-foreground"
              onClick={() => setShowDetails((v) => !v)}
            >
              {showDetails ? 'Hide details' : 'Show details'}
            </Button>
            {showDetails && (
              <pre className="max-h-[200px] overflow-y-auto rounded bg-muted p-3 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
                {error.stack}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
