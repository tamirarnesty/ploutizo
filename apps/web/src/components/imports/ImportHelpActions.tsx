import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import { NORMALIZED_IMPORT_EXAMPLE_CSV } from '@ploutizo/types';
import { downloadText } from '@/lib/download';
import { ImportGuideDialog } from './ImportGuideDialog';

export const ImportHelpActions = () => {
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                downloadText(
                  'ploutizo-normalized-import-example.csv',
                  NORMALIZED_IMPORT_EXAMPLE_CSV,
                  'text/csv'
                )
              }
            />
          }
        >
          <Download />
          Example
        </TooltipTrigger>
        <TooltipContent>Download a sample normalized CSV.</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              onClick={() => setGuideOpen(true)}
            />
          }
        >
          <FileText />
          Guide
        </TooltipTrigger>
        <TooltipContent>View the normalized CSV column guide.</TooltipContent>
      </Tooltip>
      <ImportGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
};
