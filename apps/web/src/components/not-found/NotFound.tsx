import { Link } from '@tanstack/react-router';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';

const ART_404 = ` ██╗  ██╗  ██████╗  ██╗  ██╗
 ██║  ██║ ██╔═══██╗ ██║  ██║
 ███████║ ██║   ██║ ███████║
 ╚════██║ ██║   ██║ ╚════██║
      ██║ ╚██████╔╝      ██║
      ╚═╝  ╚═════╝       ╚═╝`;

export const NotFound = () => {
  return (
    <div
      data-safe-page
      className="flex flex-col items-center justify-center bg-background"
    >
      <div className="flex w-full max-w-lg flex-col items-center">
        {/* Status bar */}
        <div className="mb-8 flex w-full items-center justify-between border-b border-border pb-3">
          <span className="font-mono text-xs tracking-widest text-muted-foreground">
            ● STATUS — 404
          </span>
          <span className="font-mono text-xs tracking-widest text-muted-foreground">
            ploutizo/~/missing
          </span>
        </div>

        {/* Art block */}
        <pre className="mb-6 font-mono text-xs leading-[1.15] text-muted-foreground opacity-40 select-none">
          {ART_404}
        </pre>

        {/* Error label */}
        <p className="mb-6 font-mono text-xs tracking-widest text-muted-foreground">
          ERROR · 0x404
        </p>

        {/* Heading + subtext */}
        <div className="mb-8 space-y-2 text-center">
          <Text as="h1" variant="h1">
            Page not found
          </Text>
          <Text variant="body-sm" className="text-muted-foreground">
            This page wandered off. It may have moved or never existed.
          </Text>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-2">
          <Button nativeButton={false} render={<Link to="/dashboard" />}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
