import { useMemo } from 'react';
import { useAppForm } from '@ploutizo/ui/components/form';
import { Button } from '@ploutizo/ui/components/button';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
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
} from '@ploutizo/ui/components/combobox';
import {
  useArchiveTag,
  useCreateTag,
  useGetTags,
} from '@/lib/data-access/tags';

export const TagsSettingsSection = () => {
  const { data: tags = [], isLoading } = useGetTags();
  const archiveTag = useArchiveTag();
  const createTag = useCreateTag();
  const anchor = useComboboxAnchor();

  const form = useAppForm({
    defaultValues: { inputValue: '' },
  });

  const tagNames = useMemo(() => tags.map((t) => t.name), [tags]);

  return (
    <section className="flex flex-col gap-4">
      <Text as="h2" variant="label" className="font-semibold">
        Tags
      </Text>

      {isLoading ? (
        <Skeleton className="h-9" />
      ) : (
        <form.Subscribe selector={(s) => s.values.inputValue}>
          {(inputValue) => {
            const trimmedInput = inputValue.trim();
            const canCreate =
              trimmedInput.length > 0 &&
              !tags.some(
                (t) => t.name.toLowerCase() === trimmedInput.toLowerCase()
              );

            const handleCreate = () => {
              if (!canCreate) return;
              createTag.mutate(
                { name: trimmedInput },
                {
                  onSuccess: () => form.setFieldValue('inputValue', ''),
                }
              );
            };

            return (
              <div className="flex flex-col gap-2">
                <Combobox
                  multiple
                  items={tagNames}
                  value={tagNames}
                  onValueChange={(newNames) => {
                    const removed = tagNames.filter(
                      (n) => !newNames.includes(n)
                    );
                    for (const name of removed) {
                      const tag = tags.find((t) => t.name === name);
                      if (tag) archiveTag.mutate(tag.id);
                    }
                  }}
                  onInputValueChange={(value) =>
                    form.setFieldValue('inputValue', value)
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
                            autoComplete="off"
                            placeholder={
                              tagNames.length === 0 ? 'Add a tag…' : ''
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && canCreate) {
                                e.preventDefault();
                                handleCreate();
                              }
                            }}
                          />
                        </>
                      )}
                    </ComboboxValue>
                  </ComboboxChips>
                  <ComboboxContent anchor={anchor}>
                    {canCreate ? (
                      <div className="border-b border-border p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto w-full justify-start px-2 py-1.5 font-normal"
                          onClick={handleCreate}
                          disabled={createTag.isPending}
                        >
                          Create &ldquo;{trimmedInput}&rdquo;
                        </Button>
                      </div>
                    ) : null}
                    <ComboboxList>
                      {(item: string) => (
                        <ComboboxItem key={item} value={item}>
                          {item}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                    <ComboboxEmpty>
                      {trimmedInput.length === 0
                        ? 'Type to create a tag'
                        : 'Tag already exists'}
                    </ComboboxEmpty>
                  </ComboboxContent>
                </Combobox>
              </div>
            );
          }}
        </form.Subscribe>
      )}
    </section>
  );
};
