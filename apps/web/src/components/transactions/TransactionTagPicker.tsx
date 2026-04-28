import { useState } from 'react';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxValue,
  useComboboxAnchor,
} from '@ploutizo/ui/components/combobox';
import { useCreateTag, useGetTags } from '@/lib/data-access/tags';

interface TransactionTagPickerProps {
  value: string[]; // current tagIds array from form field state
  onChange: (tagIds: string[]) => void; // form field handleChange
}

/**
 * Multi-select tag combobox with inline create.
 *
 * Filtering: Base UI's ComboboxEmpty requires `items` on Combobox.Root to set data-empty.
 * We pass `items` (all tags) and `filteredItems` (search-filtered tags + create option when
 * present — create option included so it is keyboard-selectable via Enter).
 *
 * form field value (tagIds) always contains only real UUIDs — translation in handleValueChange.
 * T-03.4-11: __create__ strings never reach toApiPayload.
 */
export const TransactionTagPicker = ({
  value,
  onChange,
}: TransactionTagPickerProps) => {
  const { data: tags = [] } = useGetTags();
  const createTagMutation = useCreateTag();
  const [tagInputValue, setTagInputValue] = useState('');
  const anchor = useComboboxAnchor();

  // Filter out archived tags for combobox options
  const activeTags = tags.filter((t) => t.archivedAt === null);

  // Resolve selected tag names from current tagIds for the Combobox value
  const selectedNames = value
    .map((id) => activeTags.find((t) => t.id === id)?.name)
    .filter((name): name is string => name !== undefined);

  // Filter tags by input for manual filtering (Base UI Combobox doesn't auto-filter in multi mode)
  const filteredTags = tagInputValue
    ? activeTags.filter((t) =>
        t.name.toLowerCase().includes(tagInputValue.toLowerCase())
      )
    : activeTags;

  // Build the __create__ option if input doesn't exactly match any existing tag name
  const alreadyExists = activeTags.some(
    (t) => t.name.toLowerCase() === tagInputValue.toLowerCase()
  );
  const createOption =
    tagInputValue.length > 0 && !alreadyExists
      ? `__create__${tagInputValue}`
      : null;

  const handleValueChange = (newValues: string[]) => {
    // Separate real names from __create__ items
    const realNames = newValues.filter((v) => !v.startsWith('__create__'));
    const toCreate = newValues.find((v) => v.startsWith('__create__'));

    // Translate selected names back to UUIDs — form field must only contain real UUIDs
    const realIds = realNames
      .map((name) => activeTags.find((t) => t.name === name)?.id)
      .filter((id): id is string => id !== undefined);

    // Immediately update form field with real IDs
    onChange(realIds);

    if (toCreate) {
      const name = toCreate.replace('__create__', '');
      createTagMutation.mutate(
        { name },
        {
          onSuccess: (newTag) => {
            // Push the newly created tag's real UUID into the form field
            onChange([...realIds, newTag.id]);
            setTagInputValue('');
          },
        }
      );
    }
  };

  const allTagNames = activeTags.map((t) => t.name);
  const filteredTagNames = filteredTags.map((t) => t.name);

  return (
    <Combobox
      multiple
      autoHighlight
      value={selectedNames}
      onValueChange={handleValueChange}
      onInputValueChange={setTagInputValue}
      items={allTagNames}
      filteredItems={
        createOption ? [...filteredTagNames, createOption] : filteredTagNames
      }
    >
      <ComboboxChips ref={anchor}>
        <ComboboxValue>
          {(selectedValue: string[] | null) => (
            <>
              {(selectedValue ?? []).map((name) => (
                <ComboboxChip key={name}>{name}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                placeholder={selectedNames.length === 0 ? 'Add tags…' : ''}
                autoComplete="off"
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxList>
          {filteredTags.map((tag) => (
            <ComboboxItem key={tag.id} value={tag.name}>
              {tag.name}
            </ComboboxItem>
          ))}
          {createOption !== null ? (
            <ComboboxItem key="__create__" value={createOption}>
              {`Create "${tagInputValue}"`}
            </ComboboxItem>
          ) : null}
        </ComboboxList>
        <ComboboxEmpty>
          {tagInputValue.length === 0
            ? 'Type to search or create a tag'
            : 'No matching tags'}
        </ComboboxEmpty>
        {tagInputValue.length === 0 && activeTags.length > 0 ? (
          <>
            <ComboboxSeparator />
            <p className="px-2 py-2 text-center text-xs text-muted-foreground">
              Type to search or create a tag
            </p>
          </>
        ) : null}
      </ComboboxContent>
    </Combobox>
  );
};
