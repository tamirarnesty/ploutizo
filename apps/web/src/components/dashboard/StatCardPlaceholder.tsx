import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ploutizo/ui/components/card';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';

export interface StatCardPlaceholderProps {
  label: string;
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
      <CardHeader className="p-0">
        <CardTitle className="text-xs leading-none font-normal tracking-wider text-muted-foreground uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-0">
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
