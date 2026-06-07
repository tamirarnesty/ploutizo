import { useCallback, useState } from 'react';

/** Shared open/edit state for settings screens with a single create-or-edit dialog. */
export const useSettingsEntityDialog = <T>() => {
  const [open, setOpen] = useState(false);
  const [entity, setEntity] = useState<T | null>(null);

  const openCreate = useCallback(() => {
    setEntity(null);
    setOpen(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setEntity(item);
    setOpen(true);
  }, []);

  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next);
  }, []);

  return { open, entity, openCreate, openEdit, onOpenChange };
};
