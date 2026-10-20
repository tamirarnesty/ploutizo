import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from '@ploutizo/ui/components/button-group';
import { Button } from '@ploutizo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@ploutizo/ui/components/dropdown-menu';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import { cn } from '@ploutizo/ui/lib/utils';
import { useIsMobile } from '@ploutizo/ui/hooks/use-mobile';

export type TransactionCreateMode = 'add' | 'add-another';

const CREATE_MODE_LABEL: Record<TransactionCreateMode, string> = {
  add: 'Add transaction',
  'add-another': 'Add and start another',
};

interface TransactionCreateFooterProps {
  mode: TransactionCreateMode;
  onModeChange: (mode: TransactionCreateMode) => void;
  isPending: boolean;
  showAdded: boolean;
  className?: string;
}

export const TransactionCreateFooter = ({
  mode,
  onModeChange,
  isPending,
  showAdded,
  className,
}: TransactionCreateFooterProps) => {
  const isMobile = useIsMobile();

  const primaryLabel = useMemo(() => CREATE_MODE_LABEL[mode], [mode]);

  const buttonLabel = showAdded
    ? 'Added'
    : isPending
      ? 'Adding…'
      : primaryLabel;

  return (
    <ButtonGroup
      className={cn(isMobile && 'w-full', className)}
      aria-label="Add transaction actions"
    >
      <LoadingButton
        type="submit"
        loading={isPending}
        loadingText="Adding…"
        disabled={showAdded}
        className={cn(isMobile && 'min-w-0 flex-1')}
      >
        {buttonLabel}
      </LoadingButton>
      <ButtonGroupSeparator />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="default"
              className={cn('shrink-0 px-3', isMobile && 'min-w-11')}
              aria-label="More add options"
              disabled={isPending || showAdded}
            />
          }
        >
          <ChevronDown aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuRadioGroup
            value={mode}
            onValueChange={(value) =>
              onModeChange(value as TransactionCreateMode)
            }
          >
            <DropdownMenuRadioItem value="add">
              {CREATE_MODE_LABEL.add}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="add-another">
              {CREATE_MODE_LABEL['add-another']}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
};
