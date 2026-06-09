import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Badge } from '@ploutizo/ui/components/badge';
import { Button } from '@ploutizo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ploutizo/ui/components/dialog';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ploutizo/ui/components/empty';
import { Field, FieldLabel } from '@ploutizo/ui/components/field';
import { Input } from '@ploutizo/ui/components/input';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import { Textarea } from '@ploutizo/ui/components/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import { useAppForm } from '@ploutizo/ui/components/form';
import { cn } from '@ploutizo/ui/lib/utils';
import type {
  ImportDraft,
  ImportDraftRow,
  ImportDraftSummary,
  ImportTargetAccount,
} from '@ploutizo/types';
import type { FileUploadActions } from '@/hooks/use-file-upload';
import { formatBytes, useFileUpload } from '@/hooks/use-file-upload';
import {
  useCreateImportDraft,
  useDiscardImportDraft,
  useGetImportDraft,
  useGetImportDrafts,
  useGetImportHistory,
  useGetImportTargets,
  useUpdateImportDraftRow,
} from '@/lib/data-access/imports';
import { formatCurrency } from '@/lib/formatCurrency';

const EXAMPLE_CSV = [
  'date,amount,description,type,external id,category,assignee hint,refund link hints,notes,tags',
  '2026-05-02,42.18,Neighborhood Grocery,expense,visa-1001,Groceries,Ada,,Weekly shop,food; errands',
  '2026-05-08,14.99,Returned Charger,refund,visa-1002,Household,Ada,visa-0911,Returned item,',
  '2026-05-15,250.00,Payment Thank You,settlement,visa-1003,,,chequing payment,Statement payment,',
].join('\n');

const CSV_ACCEPT = '.csv,text/csv';
const CSV_MAX_BYTES = 512 * 1024;
const REQUIRED_COLUMNS = ['date', 'amount', 'description', 'type'];
const OPTIONAL_COLUMNS = [
  'external id',
  'category',
  'assignee hint',
  'refund link hints',
  'notes',
  'tags',
];
const FORMAT_RULES = [
  ['date', 'Use YYYY-MM-DD.'],
  ['amount', 'Use a positive dollar value, such as 42.18.'],
  ['description', 'Use the merchant or statement description.'],
  ['type', 'Use expense, refund, or settlement.'],
  ['tags', 'Separate multiple tags with semicolons.'],
];

const downloadText = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const getApiErrorMessage = (error: unknown) => {
  const maybeError = error as {
    error?: { message?: string; errors?: { message?: string }[] };
  };
  return (
    maybeError.error?.message ??
    maybeError.error?.errors?.[0]?.message ??
    "Couldn't process that CSV."
  );
};

const accountLabel = (account: ImportTargetAccount) =>
  [
    account.name,
    account.institution,
    account.lastFour ? `••${account.lastFour}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

const summaryAccountLabel = (draft: ImportDraftSummary | ImportDraft) =>
  [
    draft.accountName,
    draft.accountInstitution,
    draft.accountLastFour ? `••${draft.accountLastFour}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

const statusVariant = (status: ImportDraftRow['status']) => {
  if (status === 'invalid') return 'destructive' as const;
  if (status === 'ready') return 'outline' as const;
  return 'secondary' as const;
};

const getNativeFile = (file: unknown): File | null =>
  typeof File !== 'undefined' && file instanceof File ? file : null;

const ImportGuideDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => (
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
            {REQUIRED_COLUMNS.map((column) => (
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
            {OPTIONAL_COLUMNS.map((column) => (
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
              {FORMAT_RULES.map(([field, rule]) => (
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

interface CsvFileUploadFieldProps {
  selectedFile: File | null;
  disabled: boolean;
  isDragging: boolean;
  invalid: boolean;
  clearFiles: FileUploadActions['clearFiles'];
  getInputProps: FileUploadActions['getInputProps'];
  handleDragEnter: FileUploadActions['handleDragEnter'];
  handleDragLeave: FileUploadActions['handleDragLeave'];
  handleDragOver: FileUploadActions['handleDragOver'];
  handleDrop: FileUploadActions['handleDrop'];
  openFileDialog: FileUploadActions['openFileDialog'];
}

const CsvFileUploadField = ({
  selectedFile,
  disabled,
  isDragging,
  invalid,
  clearFiles,
  getInputProps,
  handleDragEnter,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  openFileDialog,
}: CsvFileUploadFieldProps) => (
  <Field>
    <FieldLabel htmlFor="import-file">CSV file</FieldLabel>
    <div
      className={cn(
        'flex h-8 min-w-0 items-center rounded-lg border border-input bg-background transition-colors',
        isDragging && 'border-ring ring-3 ring-ring/50',
        disabled && 'cursor-not-allowed bg-input/50 opacity-50',
        invalid && 'border-destructive ring-3 ring-destructive/20'
      )}
      onDragEnter={disabled ? undefined : handleDragEnter}
      onDragLeave={disabled ? undefined : handleDragLeave}
      onDragOver={disabled ? undefined : handleDragOver}
      onDrop={disabled ? undefined : handleDrop}
    >
      <input
        {...getInputProps({
          id: 'import-file',
          accept: CSV_ACCEPT,
          disabled,
          'aria-invalid': invalid || undefined,
        })}
        className="sr-only"
      />
      <button
        type="button"
        className="flex h-full min-w-0 flex-1 items-center gap-2 px-2.5 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
        disabled={disabled}
        onClick={openFileDialog}
      >
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">
          {selectedFile ? selectedFile.name : 'Drop CSV here or browse'}
        </span>
        {selectedFile ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatBytes(selectedFile.size)}
          </span>
        ) : null}
      </button>
      {selectedFile && !disabled ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="mr-1"
          onClick={clearFiles}
        >
          <X />
          <span className="sr-only">Remove CSV file</span>
        </Button>
      ) : (
        <Upload className="mr-2 size-4 shrink-0 text-muted-foreground" />
      )}
    </div>
  </Field>
);

interface UploadFormProps {
  targets: ImportTargetAccount[];
  activeDrafts: ImportDraftSummary[];
  onDraftSelected: (draftId: string) => void;
}

const UploadForm = ({
  targets,
  activeDrafts,
  onDraftSelected,
}: UploadFormProps) => {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [
    { errors: fileErrors, files, isDragging },
    {
      clearFiles,
      getInputProps,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
    },
  ] = useFileUpload({
    accept: CSV_ACCEPT,
    maxFiles: 1,
    maxSize: CSV_MAX_BYTES,
    multiple: false,
    onFilesChange: () => setUploadError(null),
    onError: (errors) => setUploadError(errors.at(0) ?? null),
  });
  const createDraft = useCreateImportDraft();
  const activeDraftByAccount = useMemo(() => {
    const map = new Map<string, ImportDraftSummary>();
    for (const draft of activeDrafts) map.set(draft.accountId, draft);
    return map;
  }, [activeDrafts]);
  const selectedFile = getNativeFile(files[0]?.file);
  const uploadMessage = uploadError ?? fileErrors.at(0) ?? null;

  const form = useAppForm({
    defaultValues: {
      accountId: targets[0]?.id ?? '',
    },
    onSubmit: async ({ value }) => {
      if (!selectedFile) {
        setUploadError('Choose a CSV file first.');
        return;
      }
      const content = await selectedFile.text();
      createDraft.mutate(
        { accountId: value.accountId, fileName: selectedFile.name, content },
        {
          onSuccess: (response) => {
            clearFiles();
            setUploadError(null);
            onDraftSelected(response.data.id);
          },
          onError: (error) => {
            setUploadError(getApiErrorMessage(error));
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
          {(field) => {
            const activeDraft = activeDraftByAccount.get(field.state.value);
            return (
              <>
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
                          accountLabel(
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
                            {accountLabel(target)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <CsvFileUploadField
                  selectedFile={selectedFile}
                  disabled={activeDraft !== undefined}
                  isDragging={isDragging}
                  invalid={uploadMessage !== null}
                  clearFiles={clearFiles}
                  getInputProps={getInputProps}
                  handleDragEnter={handleDragEnter}
                  handleDragLeave={handleDragLeave}
                  handleDragOver={handleDragOver}
                  handleDrop={handleDrop}
                  openFileDialog={openFileDialog}
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
                      disabled={!field.state.value}
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
                              EXAMPLE_CSV,
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
        </form.AppField>
      </div>

      {uploadMessage ? (
        <Text variant="body-sm" className="mt-3 text-destructive">
          {uploadMessage}
        </Text>
      ) : null}
      <ImportGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </form>
  );
};

interface DraftListProps {
  drafts: ImportDraftSummary[];
  selectedDraftId: string | null;
  onSelect: (draftId: string) => void;
  onDiscard: (draftId: string) => void;
  isDiscarding: boolean;
}

const DraftList = ({
  drafts,
  selectedDraftId,
  onSelect,
  onDiscard,
  isDiscarding,
}: DraftListProps) => {
  if (drafts.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6">
        <Text variant="body-sm" className="text-muted-foreground">
          No active drafts.
        </Text>
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className="rounded-md border border-border p-4"
          data-selected={selectedDraftId === draft.id || undefined}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Text variant="body-sm" className="truncate font-semibold">
                {summaryAccountLabel(draft)}
              </Text>
              <Text
                variant="body-sm"
                className="truncate text-muted-foreground"
              >
                {draft.fileName ?? 'Untitled CSV'}
              </Text>
            </div>
            <Badge variant="secondary">Draft</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{draft.rowCount} rows</span>
            <span>{draft.validRowCount} reviewable</span>
            <span>{draft.invalidRowCount} invalid</span>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant={selectedDraftId === draft.id ? 'default' : 'outline'}
              onClick={() => onSelect(draft.id)}
            >
              <RotateCcw />
              Continue
            </Button>
            <LoadingButton
              type="button"
              variant="outline"
              loading={isDiscarding}
              onClick={() => onDiscard(draft.id)}
            >
              <Trash2 />
              Discard
            </LoadingButton>
          </div>
        </div>
      ))}
    </div>
  );
};

interface DraftReviewProps {
  draft: ImportDraft;
}

const DraftReview = ({ draft }: DraftReviewProps) => {
  const updateRow = useUpdateImportDraftRow();

  const updateStringField = (
    row: ImportDraftRow,
    field:
      | 'reviewDescription'
      | 'reviewCategoryName'
      | 'reviewAssigneeHint'
      | 'reviewNotes',
    value: string
  ) => {
    const next = value.trim() || null;
    if (next === row[field]) return;
    updateRow.mutate({ rowId: row.id, body: { [field]: next } });
  };

  const updateTags = (row: ImportDraftRow, value: string) => {
    const next = value
      .split(/[;,]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (next.join('|') === row.reviewTags.join('|')) return;
    updateRow.mutate({ rowId: row.id, body: { reviewTags: next } });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Text as="h2" variant="h3" className="truncate">
            {summaryAccountLabel(draft)}
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
                <th className="w-28 px-3 py-2 text-right font-medium">
                  Amount
                </th>
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
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-3 py-3 align-top font-mono text-xs text-muted-foreground">
                    {row.rowNumber}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Badge variant={statusVariant(row.status)}>
                      {row.status.replace('_', ' ')}
                    </Badge>
                    {row.invalidReason ? (
                      <Text
                        variant="body-sm"
                        className="mt-2 max-w-[180px] text-destructive"
                      >
                        {row.invalidReason}
                      </Text>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {row.reviewDate ?? row.sourceDate ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-right align-top">
                    {row.reviewAmount
                      ? formatCurrency(row.reviewAmount)
                      : (row.sourceAmount ?? '—')}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {row.reviewType ?? row.sourceType ?? '—'}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Input
                      defaultValue={row.reviewDescription ?? ''}
                      disabled={row.status === 'invalid'}
                      onBlur={(event) =>
                        updateStringField(
                          row,
                          'reviewDescription',
                          event.currentTarget.value
                        )
                      }
                    />
                    <details className="mt-2 text-xs text-muted-foreground">
                      <summary>Source</summary>
                      <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-muted p-2">
                        {JSON.stringify(row.rawData, null, 2)}
                      </pre>
                    </details>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Input
                      defaultValue={row.reviewCategoryName ?? ''}
                      disabled={row.status === 'invalid'}
                      onBlur={(event) =>
                        updateStringField(
                          row,
                          'reviewCategoryName',
                          event.currentTarget.value
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Input
                      defaultValue={row.reviewAssigneeHint ?? ''}
                      disabled={row.status === 'invalid'}
                      onBlur={(event) =>
                        updateStringField(
                          row,
                          'reviewAssigneeHint',
                          event.currentTarget.value
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Textarea
                      defaultValue={row.reviewNotes ?? ''}
                      disabled={row.status === 'invalid'}
                      className="min-h-9"
                      onBlur={(event) =>
                        updateStringField(
                          row,
                          'reviewNotes',
                          event.currentTarget.value
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Input
                      defaultValue={row.reviewTags.join('; ')}
                      disabled={row.status === 'invalid'}
                      onBlur={(event) =>
                        updateTags(row, event.currentTarget.value)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

const HistoryList = ({ history }: { history: ImportDraftSummary[] }) => {
  if (history.length === 0) {
    return (
      <Text variant="body-sm" className="text-muted-foreground">
        No recent import history.
      </Text>
    );
  }
  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {history.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-3 p-3"
        >
          <div className="min-w-0">
            <Text variant="body-sm" className="truncate font-medium">
              {summaryAccountLabel(item)}
            </Text>
            <Text variant="body-sm" className="truncate text-muted-foreground">
              {item.fileName ?? 'Untitled CSV'}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{item.status}</Badge>
            <Text variant="body-sm" className="text-muted-foreground">
              {item.rowCount} rows
            </Text>
          </div>
        </div>
      ))}
    </div>
  );
};

export const Import = () => {
  const { data: targets = [], isLoading: targetsLoading } =
    useGetImportTargets();
  const { data: activeDrafts = [], isLoading: draftsLoading } =
    useGetImportDrafts();
  const { data: history = [], isLoading: historyLoading } =
    useGetImportHistory();
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const { data: selectedDraft, isLoading: draftLoading } =
    useGetImportDraft(selectedDraftId);
  const discardDraft = useDiscardImportDraft();

  const isLoading = targetsLoading || draftsLoading || historyLoading;

  const handleDiscard = (draftId: string) => {
    discardDraft.mutate(draftId, {
      onSuccess: () => {
        if (selectedDraftId === draftId) setSelectedDraftId(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-32 w-full rounded-md" />
        <Skeleton className="h-48 w-full rounded-md" />
      </div>
    );
  }

  if (targets.length === 0) {
    return (
      <Empty className="min-h-[460px] border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CreditCard />
          </EmptyMedia>
          <EmptyTitle>No credit cards</EmptyTitle>
          <EmptyDescription>
            Add a credit card account before importing statement rows.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/accounts" />}>Add credit card</Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text as="h1" variant="h3">
          Import
        </Text>
        <div className="flex gap-2">
          {activeDrafts.length > 0 ? (
            <Badge variant="secondary">
              <AlertCircle />
              {activeDrafts.length} active
            </Badge>
          ) : (
            <Badge variant="outline">
              <CheckCircle2 />
              Ready
            </Badge>
          )}
        </div>
      </div>

      <UploadForm
        targets={targets}
        activeDrafts={activeDrafts}
        onDraftSelected={setSelectedDraftId}
      />

      <section className="space-y-3">
        <Text as="h2" variant="h3">
          Active drafts
        </Text>
        <DraftList
          drafts={activeDrafts}
          selectedDraftId={selectedDraftId}
          onSelect={setSelectedDraftId}
          onDiscard={handleDiscard}
          isDiscarding={discardDraft.isPending}
        />
      </section>

      {selectedDraftId ? (
        draftLoading || !selectedDraft ? (
          <Skeleton className="h-64 w-full rounded-md" />
        ) : (
          <DraftReview draft={selectedDraft} />
        )
      ) : null}

      <section className="space-y-3">
        <Text as="h2" variant="h3">
          Recent history
        </Text>
        <HistoryList history={history} />
      </section>
    </div>
  );
};
