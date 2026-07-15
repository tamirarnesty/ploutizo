import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { RotateCcw, Upload } from 'lucide-react';
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
import { MAX_NORMALIZED_IMPORT_BYTES } from '@ploutizo/types';
import { formatAccountLabel } from '@ploutizo/utils';
import type { ImportDraftSummary, ImportTargetAccount } from '@ploutizo/types';
import { useCreateImportDraft } from '@/lib/data-access/imports';
import { readCsvFile } from '@/lib/imports/readCsvFile';
import { getApiErrorMessage } from '@/lib/queryClient';
import { ImportHelpActions } from './ImportHelpActions';

const CSV_ACCEPT = '.csv,text/csv';

interface ImportUploadFormProps {
  targets: ImportTargetAccount[];
  targetsLoading?: boolean;
  activeDrafts: ImportDraftSummary[];
  activeDraftsLoading?: boolean;
}

export const ImportUploadForm = ({
  targets,
  targetsLoading = false,
  activeDrafts,
  activeDraftsLoading = false,
}: ImportUploadFormProps) => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const createDraft = useCreateImportDraft();
  const isCreatingDraft = createDraft.isPending;
  const firstTargetId = targets[0]?.id ?? '';
  const targetIds = useMemo(
    () => new Set(targets.map((target) => target.id)),
    [targets]
  );

  const activeDraftByAccount = useMemo(() => {
    const map = new Map<string, ImportDraftSummary>();
    for (const draft of activeDrafts) map.set(draft.accountId, draft);
    return map;
  }, [activeDrafts]);

  const goToDraftReview = (draftId: string) => {
    void navigate({
      to: '/transactions/import/$draftId',
      params: { draftId },
    });
  };

  const form = useAppForm({
    defaultValues: {
      accountId: firstTargetId,
    },
    onSubmit: async ({ value }) => {
      if (!selectedFile) {
        setUploadError('Choose a CSV file first.');
        return;
      }
      let content: string;
      try {
        content = await readCsvFile(selectedFile);
      } catch (error) {
        setUploadError(
          getApiErrorMessage(error, "Couldn't read that CSV file.")
        );
        return;
      }
      createDraft.mutate(
        { accountId: value.accountId, fileName: selectedFile.name, content },
        {
          onSuccess: (response) => {
            setSelectedFile(null);
            setUploadError(null);
            goToDraftReview(response.data.id);
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

  useEffect(() => {
    if (!firstTargetId) return;
    const currentAccountId = form.getFieldValue('accountId');
    if (currentAccountId && targetIds.has(currentAccountId)) return;
    form.setFieldValue('accountId', firstTargetId);
  }, [firstTargetId, form, targetIds]);

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
                <SelectTrigger
                  id="import-account"
                  disabled={
                    isCreatingDraft || targetsLoading || targets.length === 0
                  }
                >
                  <SelectValue
                    placeholder={
                      targetsLoading
                        ? 'Loading credit cards...'
                        : 'Select a credit card'
                    }
                  >
                    {(value: string) => {
                      const target = targets.find(
                        (option) => option.id === value
                      );
                      return target
                        ? formatAccountLabel(target)
                        : 'Select a credit card';
                    }}
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
                  disabled={
                    isCreatingDraft ||
                    targetsLoading ||
                    activeDraftsLoading ||
                    activeDraft !== undefined
                  }
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
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isCreatingDraft}
                            onClick={() => goToDraftReview(activeDraft.id)}
                          />
                        }
                      >
                        <RotateCcw />
                        Continue
                      </TooltipTrigger>
                      <TooltipContent>
                        Continue reviewing the active draft for this credit
                        card.
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <LoadingButton
                      type="submit"
                      icon={<Upload />}
                      loading={isCreatingDraft}
                      disabled={
                        isCreatingDraft ||
                        targetsLoading ||
                        activeDraftsLoading ||
                        !accountId
                      }
                    >
                      Upload
                    </LoadingButton>
                  )}
                  <ImportHelpActions />
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
    </form>
  );
};
