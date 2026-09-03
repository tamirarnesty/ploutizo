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
import { IMPORT_CONTENT_PROFILE_IDS, MAX_IMPORT_BYTES } from '@ploutizo/types';
import { formatAccountLabel } from '@ploutizo/utils';
import type {
  ImportContentProfileId,
  ImportContentSelection,
  ImportDraftSummary,
  ImportTargetAccount,
  InspectImportResult,
} from '@ploutizo/types';
import {
  useCreateImportDraft,
  useInspectImport,
} from '@/lib/data-access/imports';
import { readCsvFile } from '@/lib/imports/readCsvFile';
import { getApiErrorMessage } from '@/lib/queryClient';
import { ImportHelpActions } from './ImportHelpActions';

const CSV_ACCEPT = '.csv,text/csv';

const PROFILE_LABELS: Record<ImportContentProfileId, string> = {
  internal: 'Ploutizo normalized',
  amex: 'Amex',
  pc_financial: 'PC Financial',
  mdy_debit_credit_balance: 'Generic: MM/DD/YYYY debit/credit/balance',
  iso_debit_credit_masked_card: 'Generic: ISO date debit/credit/masked card',
};

interface ImportUploadFormProps {
  targets: ImportTargetAccount[];
  targetsLoading?: boolean;
  activeDrafts: ImportDraftSummary[];
  activeDraftsLoading?: boolean;
}

type UploadStep =
  | { kind: 'idle' }
  | { kind: 'inspecting' }
  | {
      kind: 'choose_format';
      inspectResult: Extract<InspectImportResult, { kind: 'mapping_required' }>;
      content: string;
      fileName: string;
      accountId: string;
    }
  | { kind: 'creating' };

export const ImportUploadForm = ({
  targets,
  targetsLoading = false,
  activeDrafts,
  activeDraftsLoading = false,
}: ImportUploadFormProps) => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [step, setStep] = useState<UploadStep>({ kind: 'idle' });
  const [selectedProfileId, setSelectedProfileId] = useState<
    ImportContentProfileId | ''
  >('');

  const inspectImport = useInspectImport();
  const createDraft = useCreateImportDraft();

  const isLoading = step.kind === 'inspecting' || step.kind === 'creating';

  const firstTargetId = targets[0]?.id ?? '';
  const targetIds = useMemo(
    () => new Set(targets.map((target) => target.id)),
    [targets]
  );

  const activeDraftByAccount = useMemo(() => {
    const map = new Map<string, ImportDraftSummary>();
    for (const draft of activeDrafts) map.set(draft.account.id, draft);
    return map;
  }, [activeDrafts]);

  const goToDraftReview = (draftId: string) => {
    void navigate({
      to: '/transactions/import/$draftId',
      params: { draftId },
    });
  };

  const submitDraft = (
    accountId: string,
    fileName: string,
    content: string,
    selection: ImportContentSelection
  ) => {
    setStep({ kind: 'creating' });
    createDraft.mutate(
      { accountId, fileName, content, selection },
      {
        onSuccess: (response) => {
          setSelectedFile(null);
          setUploadError(null);
          setStep({ kind: 'idle' });
          goToDraftReview(response.data.id);
        },
        onError: (error) => {
          setUploadError(
            getApiErrorMessage(error, "Couldn't process that CSV.")
          );
          setStep({ kind: 'idle' });
        },
      }
    );
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

      setStep({ kind: 'inspecting' });
      inspectImport.mutate(
        { content },
        {
          onSuccess: (response) => {
            const result = response.data;
            if (result.kind === 'recognized') {
              submitDraft(value.accountId, selectedFile.name, content, {
                kind: 'profile',
                profileId: result.profileId,
              });
            } else {
              setStep({
                kind: 'choose_format',
                inspectResult: result,
                content,
                fileName: selectedFile.name,
                accountId: value.accountId,
              });
              const first = result.suggestedProfileIds[0] as
                | ImportContentProfileId
                | undefined;
              setSelectedProfileId(first ?? '');
            }
          },
          onError: (error) => {
            setUploadError(
              getApiErrorMessage(error, "Couldn't process that CSV.")
            );
            setStep({ kind: 'idle' });
          },
        }
      );
    },
  });

  const handleConfirmFormat = () => {
    if (step.kind !== 'choose_format') return;
    if (!selectedProfileId) {
      setUploadError('Select a format to continue.');
      return;
    }
    setUploadError(null);
    submitDraft(step.accountId, step.fileName, step.content, {
      kind: 'profile',
      profileId: selectedProfileId,
    });
  };

  const handleCancelFormatChoice = () => {
    setStep({ kind: 'idle' });
    setSelectedProfileId('');
    setUploadError(null);
  };

  useEffect(() => {
    if (!firstTargetId) return;
    const currentAccountId = form.getFieldValue('accountId');
    if (currentAccountId && targetIds.has(currentAccountId)) return;
    form.setFieldValue('accountId', firstTargetId);
  }, [firstTargetId, form, targetIds]);

  if (step.kind === 'choose_format') {
    const suggestedIds =
      step.inspectResult.suggestedProfileIds.length > 0
        ? step.inspectResult.suggestedProfileIds
        : [...IMPORT_CONTENT_PROFILE_IDS];

    return (
      <div className="space-y-4 rounded-md border border-border p-4">
        <div>
          <Text as="h3" variant="h3">
            Choose import format
          </Text>
          <Text variant="body-sm" className="mt-1 text-muted-foreground">
            This file wasn't automatically recognized. Choose the format that
            matches your CSV.
          </Text>
        </div>

        <Field>
          <FieldLabel htmlFor="import-format">Format</FieldLabel>
          <Select
            value={selectedProfileId}
            onValueChange={(value) => {
              if (value) setSelectedProfileId(value);
            }}
          >
            <SelectTrigger id="import-format">
              <SelectValue placeholder="Select a format" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {suggestedIds.map((profileId) => (
                  <SelectItem key={profileId} value={profileId}>
                    {PROFILE_LABELS[profileId]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        {uploadError ? (
          <Text variant="body-sm" className="text-destructive">
            {uploadError}
          </Text>
        ) : null}

        <div className="flex gap-2">
          <LoadingButton
            type="button"
            icon={<Upload />}
            loading={isLoading}
            disabled={isLoading || !selectedProfileId}
            onClick={handleConfirmFormat}
          >
            Upload
          </LoadingButton>
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={handleCancelFormatChoice}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

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
                  disabled={isLoading || targetsLoading || targets.length === 0}
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
                  maxSize={MAX_IMPORT_BYTES}
                  disabled={
                    isLoading ||
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
                            disabled={isLoading}
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
                      loading={isLoading}
                      disabled={
                        isLoading ||
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
