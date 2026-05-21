import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
} from '@ploutizo/ui/components/item';
import { Skeleton } from '@ploutizo/ui/components/skeleton';

/** Mirrors SettlementMemberListRow Item layout (avatar + two-line stack + amount). */
export const SettlementMemberRowSkeleton = () => (
  <Item
    variant="default"
    size="xs"
    className="w-full flex-nowrap border-0 bg-transparent px-0 py-1 shadow-none hover:bg-transparent"
  >
    <ItemMedia variant="default" className="shrink-0">
      <Skeleton className="size-6 shrink-0 rounded-full motion-safe:animate-pulse" />
    </ItemMedia>
    <ItemContent className="min-w-0 gap-1">
      <Skeleton className="h-4 w-24 motion-safe:animate-pulse" />
      <Skeleton className="h-3 w-20 motion-safe:animate-pulse" />
    </ItemContent>
    <ItemActions className="shrink-0">
      <Skeleton className="h-5 w-16 motion-safe:animate-pulse" />
    </ItemActions>
  </Item>
);
