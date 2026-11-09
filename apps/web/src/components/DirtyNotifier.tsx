import { useEffect } from 'react';

/**
 * Reports the host form's dirty state to a parent (e.g. a sheet that prompts
 * before discarding unsaved changes). Renders nothing.
 */
export const DirtyNotifier = ({
  isDirty,
  onChange,
}: {
  isDirty: boolean;
  onChange: (dirty: boolean) => void;
}) => {
  useEffect(() => {
    onChange(isDirty);
  }, [isDirty, onChange]);
  return null;
};
