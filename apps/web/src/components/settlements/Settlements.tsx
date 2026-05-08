import { Text } from '@ploutizo/ui/components/text';

// Phase 4.2 placeholder per D-07 — Phase 7.3 fleshes this out.
// Copy strings are exact-match per UI-SPEC.md Copywriting Contract.
export const Settlements = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Text as="h1" variant="h2" className="min-w-0 truncate">
          Settlement history
        </Text>
      </div>
      <Text variant="body" className="text-muted-foreground">
        Detailed settlement view coming soon.
      </Text>
    </div>
  );
};
