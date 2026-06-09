import { useMemo, useState } from 'react';
import { Download, FileText, RotateCcw, Upload } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import { Field, FieldLabel } from '@ploutizo/ui/components/field';
import { FileField } from '@ploutizo/ui/components/file-field';
import { useAppForm } from '@ploutizo/ui/components/form';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import { Text } from '@ploutizo/ui/components/text';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import {
  MAX_NORMALIZED_IMPORT_BYTES,
  NORMALIZED_IMPORT_EXAMPLE_CSV,
} from '@ploutizo/types';
import type { ImportDraftSummary, ImportTargetAccount } from '@ploutizo/types';
import { useCreateImportDraft } from '@/lib/data-access/imports';
import { downloadText } from '@/lib/download';
import { readCsvFile } from '@/lib/imports/readCsvFile';
import { getApiErrorMessage } from '@/lib/queryClient';
import { formatAccountLabel } from './importPresentation';
import { ImportGuideDialog } from './ImportGuideDialog';

const CSV_ACCEPT = '.csv,text/csv';

interface ImportUploadFormProps {
  targets: ImportTargetAccount[];
  activeDrafts: ImportDraftSummary[];
  onDraftSelected: (draftId: string) => void;
}

export const ImportUploadForm = ({
  targets,
  activeDrafts,
  onDraftSelected,
}: ImportUploadFormProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const createDraft = useCreateImportDraft();

  const activeDraftByAccount = useMemo(() => {
    const map = new Map<string, ImportDraftSummary>();
    for (const draft of activeDrafts) map.set(draft.accountId, draft);
    return map;
  }, [activeDrafts]);

  const form = useAppForm({
    defaultValues: {
      accountId: targets[0]?.id ?? '',
    },
    onSubmit: async ({ value }) => {
      if (!selectedFile) {
        setUploadError('Choose a CSV file first.');
        return;
      }
      const content = await readCsvFile(selectedFile);
      createDraft.mutate(
        { accountId: value.accountId, fileName: selectedFile.name, content },
        {
          onSuccess: (response) => {
            setSelectedFile(null);
            setUploadError(null);
            onDraftSelected(response.data.id);
          },
          onError: (error) => {
            setUploadError(
              getApiErrorMessage(error, "Couldn't process that CSV.")
            );
          },
        }
      );
    },
  });

  return (
    <form
      className="rounded-md border border-border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto] lg:items-end">
        <form.AppField name="accountId">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="import-account">Credit card</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(value) => {
                  if (value) field.handleChange(value);
                }}
              >
                <SelectTrigger id="import-account">
                  <SelectValue>
                    {(value: string) =>
                      formatAccountLabel(
                        targets.find((target) => target.id === value) ??
                          targets[0]
                      )
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {targets.map((target) => (
                      <SelectItem key={target.id} value={target.id}>
                        {formatAccountLabel(target)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.AppField>

        <form.Subscribe selector={(state) => state.values.accountId}>
          {(accountId) => {
            const activeDraft = activeDraftByAccount.get(accountId);
            return (
              <>
                <FileField
                  id="import-file"
                  label="CSV file"
                  accept={CSV_ACCEPT}
                  maxSize={MAX_NORMALIZED_IMPORT_BYTES}
                  disabled={activeDraft !== undefined}
                  invalid={uploadError !== null}
                  value={selectedFile}
                  onChange={(file) => {
                    setSelectedFile(file);
                    setUploadError(null);
                  }}
                  onError={(message) => setUploadError(message)}
                />

                <div className="flex flex-wrap gap-2">
                  {activeDraft ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onDraftSelected(activeDraft.id)}
                    >
                      <RotateCcw />
                      Continue
                    </Button>
                  ) : (
                    <LoadingButton
                      type="submit"
                      loading={createDraft.isPending}
                      disabled={!accountId}
                    >
                      <Upload />
                      Upload
                    </LoadingButton>
                  )}
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
                    <TooltipContent>
                      Download a sample normalized CSV.
                    </TooltipContent>
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
                    <TooltipContent>
                      View the normalized CSV column guide.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </>
            );
          }}
        </form.Subscribe>
      </div>

      {uploadError ? (
        <Text variant="body-sm" className="mt-3 text-destructive">
          {uploadError}
        </Text>
      ) : null}
      <ImportGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </form>
  );
};
