import { Badge } from '@ploutizo/ui/components/badge';
import { Text } from '@ploutizo/ui/components/text';
import {
  INTERNAL_IMPORT_FORMAT_RULES,
  INTERNAL_IMPORT_OPTIONAL_COLUMNS,
  INTERNAL_IMPORT_REQUIRED_COLUMNS,
} from '@ploutizo/types';
import { AppDialog } from '@/components/overlays/AppDialog';

interface ImportGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImportGuideDialog = ({
  open,
  onOpenChange,
}: ImportGuideDialogProps) => (
  <AppDialog
    open={open}
    onOpenChange={onOpenChange}
    title="CSV import guide"
    description="Format statement rows as a normalized Ploutizo CSV before uploading."
    contentClassName="max-w-lg sm:max-w-lg"
  >
    <div className="grid gap-4 text-sm">
      <section className="space-y-2">
        <Text variant="body-sm" className="font-medium">
          Required columns
        </Text>
        <div className="flex flex-wrap gap-2">
          {INTERNAL_IMPORT_REQUIRED_COLUMNS.map((column) => (
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
          {INTERNAL_IMPORT_OPTIONAL_COLUMNS.map((column) => (
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
            {INTERNAL_IMPORT_FORMAT_RULES.map(([field, rule]) => (
              <tr key={field} className="border-b border-border last:border-0">
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
  </AppDialog>
);
