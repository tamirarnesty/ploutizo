import { Card, CardContent } from '@ploutizo/ui/components/card';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';

export interface StatCardPlaceholderProps {
  label: string;
  // When provided, this is a "live" stat card (e.g. CREDIT CARD OWED).
  // When undefined/null, renders the ghost/deferred placeholder per UI-SPEC.
  value?: string;
  caption?: string;
}

// Per UI-SPEC.md StatCardPlaceholder Specification + Copywriting Contract:
//   Deferred: $— + "Available in Phase 7.3"
//   Live:     formatted value + caption (e.g. "N cards total")
export const StatCardPlaceholder = ({
  label,
  value,
  caption,
}: StatCardPlaceholderProps) => {
  const isPlaceholder = value === undefined;
  return (
    <Card className="p-4">
      <CardContent className="space-y-1 p-0">
        <Text
          variant="caption"
          className="tracking-wider text-muted-foreground uppercase"
        >
          {label}
        </Text>
        <Text
          as="p"
          variant="h3"
          className={cn('mt-1', isPlaceholder && 'text-muted-foreground/40')}
        >
          {isPlaceholder ? '$—' : value}
        </Text>
        <Text
          variant="caption"
          className={cn(
            'mt-1',
            isPlaceholder ? 'text-muted-foreground/40' : 'text-muted-foreground'
          )}
        >
          {isPlaceholder ? 'Available in Phase 7.3' : (caption ?? '')}
        </Text>
      </CardContent>
    </Card>
  );
};
