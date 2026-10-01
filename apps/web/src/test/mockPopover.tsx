import { cloneElement, createContext, isValidElement, useContext } from 'react';
import { vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';

const PopoverContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

export const popoverMock = {
  Popover: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
  }) => (
    <PopoverContext.Provider
      value={{ open, setOpen: (nextOpen) => onOpenChange(nextOpen) }}
    >
      <div data-open={open}>{children}</div>
    </PopoverContext.Provider>
  ),
  PopoverTrigger: ({
    render: trigger,
    children,
  }: {
    render?: ReactElement;
    children?: ReactNode;
  }) => {
    const popover = useContext(PopoverContext);

    if (trigger && isValidElement<{ onClick?: () => void }>(trigger)) {
      return cloneElement(trigger, {
        onClick: () => popover?.setOpen(true),
        children,
      } as { onClick: () => void });
    }

    return <div onClick={() => popover?.setOpen(true)}>{children}</div>;
  },
  PopoverContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
};

vi.mock('@ploutizo/ui/components/popover', () => popoverMock);
