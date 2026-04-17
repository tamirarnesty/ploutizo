import { useState } from 'react'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@ploutizo/ui/components/combobox'
import { useGetTags } from '@/lib/data-access/tags'
import { useCreateTag } from '@/lib/data-access/tags'

interface TransactionTagPickerProps {
  value: string[]           // current tagIds array from form field state
  onChange: (tagIds: string[]) => void  // form field handleChange
}

/**
 * Multi-select tag combobox with inline create.
 *
 * Design notes:
 * - items are tag names (not UUIDs) so base-ui's built-in filter matches on readable text
 * - filteredItems holds the __create__ option (bypasses base-ui filtering)
 * - form field value (tagIds) always contains only real UUIDs — translation in handleValueChange
 * - T-03.4-11: __create__ strings never reach toApiPayload
 */
export function TransactionTagPicker({ value, onChange }: TransactionTagPickerProps) {
  const { data: tags = [] } = useGetTags()
  const createTagMutation = useCreateTag()
  const [tagInputValue, setTagInputValue] = useState('')
  const anchor = useComboboxAnchor()

  // Filter out archived tags for combobox options
  const activeTags = tags.filter((t) => t.archivedAt === null)

  // Resolve selected tag names from current tagIds for the Combobox value
  const selectedNames = value
    .map((id) => activeTags.find((t) => t.id === id)?.name)
    .filter((name): name is string => name !== undefined)

  // Build the __create__ option if input doesn't match any existing tag name
  const alreadyExists = activeTags.some(
    (t) => t.name.toLowerCase() === tagInputValue.toLowerCase()
  )
  const createOption =
    tagInputValue.length > 0 && !alreadyExists
      ? `__create__${tagInputValue}`
      : null

  // items = active tag names (base-ui filters these on typing)
  // filteredItems = __create__ option (bypasses filtering so it always appears)
  const items = activeTags.map((t) => t.name)

  const handleValueChange = (newValues: string[]) => {
    // Separate real names from __create__ items
    const realNames = newValues.filter((v) => !v.startsWith('__create__'))
    const toCreate = newValues.find((v) => v.startsWith('__create__'))

    // Translate selected names back to UUIDs — form field must only contain real UUIDs
    const realIds = realNames
      .map((name) => activeTags.find((t) => t.name === name)?.id)
      .filter((id): id is string => id !== undefined)

    // Immediately update form field with real IDs
    onChange(realIds)

    if (toCreate) {
      const name = toCreate.replace('__create__', '')
      createTagMutation.mutate(
        { name },
        {
          onSuccess: (newTag) => {
            // Push the newly created tag's real UUID into the form field
            onChange([...realIds, newTag.id])
            setTagInputValue('')
          },
        }
      )
    }
  }

  return (
    <Combobox
      multiple
      items={items}
      filteredItems={createOption ? [createOption] : []}
      value={selectedNames}
      onValueChange={handleValueChange}
      onInputValueChange={setTagInputValue}
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
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item.startsWith('__create__')
                ? `Create "${item.replace('__create__', '')}"`
                : item}
            </ComboboxItem>
          )}
        </ComboboxList>
        <ComboboxEmpty>
          {tagInputValue.length === 0 ? 'Type to search or create a tag' : 'Tag already exists'}
        </ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  )
}
