import { Text } from '@ploutizo/ui/components/text';
import { CUSTOM_FORMAT_CHOICE, formatChoiceIntro } from './importFormatChoice';
import { useImportUpload } from './ImportUploadContext';
import { ImportCustomMappingFields } from './format/ImportCustomMappingFields';
import { ImportFormatActions } from './format/ImportFormatActions';
import { ImportFormatPreview } from './format/ImportFormatPreview';
import { useImportFormatChoiceForm } from './format/importFormatForm';
import { ImportProfilePicker } from './format/ImportProfilePicker';

export const ImportFormatChoiceForm = () => {
  const { step, isSubmitting, uploadError, submitDraft, cancelFormatChoice } =
    useImportUpload();

  if (step.kind !== 'choose_format') {
    throw new Error('ImportFormatChoiceForm requires the choose_format step.');
  }

  const {
    candidateProfileIds,
    columns,
    sampleRows,
    accountId,
    fileName,
    content,
  } = step;
  const hasColumns = columns.length > 0;

  const form = useImportFormatChoiceForm(
    candidateProfileIds,
    columns,
    (selection) => submitDraft(accountId, fileName, content, selection)
  );

  return (
    <form
      className="space-y-4 rounded-md border border-border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <div>
        <Text as="h3" variant="h3">
          Choose import format
        </Text>
        <Text variant="body-sm" className="mt-1 text-muted-foreground">
          {formatChoiceIntro(candidateProfileIds)}
        </Text>
      </div>

      <ImportProfilePicker
        form={form}
        candidateProfileIds={candidateProfileIds}
      />

      <ImportFormatPreview columns={columns} sampleRows={sampleRows} />

      {candidateProfileIds.length === 0 && hasColumns ? (
        <ImportCustomMappingFields form={form} columns={columns} />
      ) : (
        <form.Subscribe selector={(state) => state.values.formatChoice}>
          {(formatChoice) =>
            formatChoice === CUSTOM_FORMAT_CHOICE && hasColumns ? (
              <ImportCustomMappingFields form={form} columns={columns} />
            ) : null
          }
        </form.Subscribe>
      )}

      {uploadError ? (
        <Text variant="body-sm" className="text-destructive">
          {uploadError}
        </Text>
      ) : null}

      <ImportFormatActions
        isSubmitting={isSubmitting}
        onCancel={cancelFormatChoice}
      />
    </form>
  );
};
