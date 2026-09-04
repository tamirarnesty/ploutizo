import { useAppForm } from '@ploutizo/ui/components/form';
import type {
  ImportContentProfileId,
  ImportContentSelection,
} from '@ploutizo/types';
import {
  buildImportContentSelection,
  createDefaultFormatChoiceValues,
} from '../importFormatChoice';

export const useImportFormatChoiceForm = (
  candidateProfileIds: ImportContentProfileId[],
  columns: string[],
  onSubmit: (selection: ImportContentSelection) => void
) =>
  useAppForm({
    defaultValues: createDefaultFormatChoiceValues(
      candidateProfileIds,
      columns
    ),
    onSubmit: ({ value }) => {
      onSubmit(buildImportContentSelection(value));
    },
  });

export type ImportFormatFormApi = ReturnType<typeof useImportFormatChoiceForm>;
