import { Upload } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';

type ImportFormatActionsProps = {
  isSubmitting: boolean;
  onCancel: () => void;
};

export const ImportFormatActions = ({
  isSubmitting,
  onCancel,
}: ImportFormatActionsProps) => (
  <div className="flex gap-2">
    <LoadingButton
      type="submit"
      icon={<Upload />}
      loading={isSubmitting}
      disabled={isSubmitting}
    >
      Upload
    </LoadingButton>
    <Button
      type="button"
      variant="outline"
      disabled={isSubmitting}
      onClick={onCancel}
    >
      Cancel
    </Button>
  </div>
);
