import { Badge } from '@ploutizo/ui/components/badge';
import { Text } from '@ploutizo/ui/components/text';
import type { ImportDraft } from '@ploutizo/types';
import { formatDraftAccountLabel } from './importPresentation';
import { ImportDraftReviewRow } from './ImportDraftReviewRow';

interface ImportDraftReviewProps {
  draft: ImportDraft;
}

export const ImportDraftReview = ({ draft }: ImportDraftReviewProps) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <Text as="h2" variant="h3" className="truncate">
          {formatDraftAccountLabel(draft)}
        </Text>
        <Text variant="body-sm" className="truncate text-muted-foreground">
          {draft.fileName ?? 'Untitled CSV'}
        </Text>
      </div>
      <div className="flex gap-2">
        <Badge variant="outline">{draft.validRowCount} reviewable</Badge>
        {draft.invalidRowCount > 0 ? (
          <Badge variant="destructive">{draft.invalidRowCount} invalid</Badge>
        ) : null}
      </div>
    </div>

    <div className="overflow-hidden rounded-md border border-border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="w-16 px-3 py-2 font-medium">Row</th>
              <th className="w-32 px-3 py-2 font-medium">Status</th>
              <th className="w-28 px-3 py-2 font-medium">Date</th>
              <th className="w-28 px-3 py-2 text-right font-medium">Amount</th>
              <th className="w-28 px-3 py-2 font-medium">Type</th>
              <th className="min-w-[220px] px-3 py-2 font-medium">
                Description
              </th>
              <th className="w-40 px-3 py-2 font-medium">Category</th>
              <th className="w-40 px-3 py-2 font-medium">Assignee</th>
              <th className="w-44 px-3 py-2 font-medium">Notes</th>
              <th className="w-40 px-3 py-2 font-medium">Tags</th>
            </tr>
          </thead>
          <tbody>
            {draft.rows.map((row) => (
              <ImportDraftReviewRow key={row.id} draftId={draft.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
);
