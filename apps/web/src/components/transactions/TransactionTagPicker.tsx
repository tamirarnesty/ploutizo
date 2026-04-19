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
import { useCreateTag, useGetTags  } from '@/lib/data-access/tags'

interface TransactionTagPickerProps {
  value: string[]           // current tagIds array from form field state
  onChange: (tagIds: string[]) => void  // form field handleChange
}

/**
 * Multi-select tag combobox with inline create.
 *
 * Design notes:
 * - ComboboxList children must be static JSX (not a render function) — Base UI
 *   ComboboxPrimitive.List is a plain <ul> wrapper that does not invoke children as a function.
 * - Base UI filters items automatically by matching typed input against each item's `value` prop.
 * - The __create__ option value is `__create__${tagInputValue}`, which contains the user's input
 *   as a substring, so Base UI's default filter keeps it visible when there is input.
 * - form field value (tagIds) always contains only real UUIDs — translation in handleValueChange
 * - T-03.4-11: __create__ strings never reach toApiPayload
 */
export const TransactionTagPicker = ({ value, onChange }: TransactionTagPickerProps) => {
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
          {activeTags.map((tag) => (
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
          {tagInputValue.length === 0 ? 'Type to search or create a tag' : 'Tag already exists'}
        </ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  )
}
