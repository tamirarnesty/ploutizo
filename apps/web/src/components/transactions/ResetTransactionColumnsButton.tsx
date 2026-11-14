import { RotateCcw } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import { useTransactionColumnLayout } from './useTransactionColumnLayout';

export const ResetTransactionColumnsButton = () => {
  const { isCustom, reset } = useTransactionColumnLayout();
  if (!isCustom) return null;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Reset columns"
            onClick={reset}
          >
            <RotateCcw className="size-4" />
          </Button>
        }
      />
      <TooltipContent>Reset columns</TooltipContent>
    </Tooltip>
  );
};
