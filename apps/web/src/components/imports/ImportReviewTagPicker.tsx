import { useMemo } from 'react';
import { TransactionTagPicker } from '@/components/transactions/TransactionTagPicker';
import { useGetTags } from '@/lib/data-access/tags';

interface ImportReviewTagPickerProps {
  value: string[];
  onChange: (tagNames: string[]) => void;
  inputAriaLabel?: string;
}

export const ImportReviewTagPicker = ({
  value,
  onChange,
  inputAriaLabel,
}: ImportReviewTagPickerProps) => {
  const { data: tags = [] } = useGetTags();

  const tagIds = useMemo(
    () =>
      value
        .map((name) => tags.find((tag) => tag.name === name)?.id)
        .filter((id): id is string => id !== undefined),
    [tags, value]
  );

  return (
    <TransactionTagPicker
      value={tagIds}
      inputAriaLabel={inputAriaLabel}
      onChange={(nextTagIds) => {
        const nextNames = nextTagIds
          .map((id) => tags.find((tag) => tag.id === id)?.name)
          .filter((name): name is string => name !== undefined);
        onChange(nextNames);
      }}
    />
  );
};
