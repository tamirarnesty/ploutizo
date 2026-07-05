import { Badge } from '@ploutizo/ui/components/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ploutizo/ui/components/dialog';
import { Text } from '@ploutizo/ui/components/text';
import {
  NORMALIZED_IMPORT_FORMAT_RULES,
  NORMALIZED_IMPORT_OPTIONAL_COLUMNS,
  NORMALIZED_IMPORT_REQUIRED_COLUMNS,
} from '@ploutizo/types';

interface ImportGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImportGuideDialog = ({
  open,
  onOpenChange,
}: ImportGuideDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>CSV import guide</DialogTitle>
        <DialogDescription>
          Format statement rows as a normalized Ploutizo CSV before uploading.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 text-sm">
        <section className="space-y-2">
          <Text variant="body-sm" className="font-medium">
            Required columns
          </Text>
          <div className="flex flex-wrap gap-2">
            {NORMALIZED_IMPORT_REQUIRED_COLUMNS.map((column) => (
              <Badge key={column} variant="outline">
                {column}
              </Badge>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <Text variant="body-sm" className="font-medium">
            Optional columns
          </Text>
          <div className="flex flex-wrap gap-2">
            {NORMALIZED_IMPORT_OPTIONAL_COLUMNS.map((column) => (
              <Badge key={column} variant="secondary">
                {column}
              </Badge>
            ))}
          </div>
        </section>

        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="w-32 px-3 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">Rule</th>
              </tr>
            </thead>
            <tbody>
              {NORMALIZED_IMPORT_FORMAT_RULES.map(([field, rule]) => (
                <tr
                  key={field}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {field}
                  </td>
                  <td className="px-3 py-2">{rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
