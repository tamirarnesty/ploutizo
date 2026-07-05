import { useMemo } from 'react';
import { TransactionTagPicker } from '@/components/transactions/TransactionTagPicker';
import { useGetTags } from '@/lib/data-access/tags';

interface ImportReviewTagPickerProps {
  value: string[];
  onChange: (tagNames: string[]) => void;
  inputId?: string;
  inputAriaLabel?: string;
}

export const ImportReviewTagPicker = ({
  value,
  onChange,
  inputId,
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
      inputId={inputId}
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
