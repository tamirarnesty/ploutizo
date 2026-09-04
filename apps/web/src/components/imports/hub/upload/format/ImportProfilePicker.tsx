import { Field, FieldLabel } from '@ploutizo/ui/components/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import { IMPORT_CONTENT_PROFILE_LABELS } from '@ploutizo/types';
import type { ImportContentProfileId } from '@ploutizo/types';
import { CUSTOM_FORMAT_CHOICE } from '../importFormatChoice';
import type { FormatChoice } from '../importFormatChoice';
import type { ImportFormatFormApi } from './importFormatForm';

type ImportProfilePickerProps = {
  form: ImportFormatFormApi;
  candidateProfileIds: ImportContentProfileId[];
};

export const ImportProfilePicker = ({
  form,
  candidateProfileIds,
}: ImportProfilePickerProps) => {
  if (candidateProfileIds.length === 0) return null;

  return (
    <form.AppField name="formatChoice">
      {(field) => (
        <Field>
          <FieldLabel htmlFor="import-format">Format</FieldLabel>
          <Select
            value={field.state.value}
            onValueChange={(value) => {
              if (value) field.handleChange(value as FormatChoice);
            }}
          >
            <SelectTrigger id="import-format">
              <SelectValue placeholder="Select a format" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {candidateProfileIds.map((profileId) => (
                  <SelectItem key={profileId} value={profileId}>
                    {IMPORT_CONTENT_PROFILE_LABELS[profileId]}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_FORMAT_CHOICE}>
                  Custom mapping
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      )}
    </form.AppField>
  );
};
