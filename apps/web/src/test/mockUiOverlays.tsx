import { createContext, useContext } from 'react';
import type { MouseEventHandler, ReactNode } from 'react';

type OpenChangeHandler = (open: boolean, ...rest: unknown[]) => void;

const AlertDialogOpenChangeContext = createContext<
  OpenChangeHandler | undefined
>(undefined);

const CloseControl = ({
  label,
  onClose,
}: {
  label: string;
  onClose?: OpenChangeHandler;
}) =>
  onClose ? (
    <button type="button" aria-label={label} onClick={() => onClose(false)}>
      {label}
    </button>
  ) : null;

export const dialogMock = {
  Dialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open?: boolean;
    onOpenChange?: OpenChangeHandler;
    children: ReactNode;
  }) => (
    <div data-slot="dialog" data-open={String(open)}>
      {children}
      <CloseControl label="Close" onClose={onOpenChange} />
    </div>
  ),
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div data-slot="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogClose: () => null,
  DialogTrigger: () => null,
  DialogPortal: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogOverlay: () => null,
};

export const sheetMock = {
  Sheet: ({
    open,
    onOpenChange,
    children,
  }: {
    open?: boolean;
    onOpenChange?: OpenChangeHandler;
    children: ReactNode;
  }) => (
    <div data-slot="sheet" data-open={String(open)}>
      <CloseControl label="Close sheet" onClose={onOpenChange} />
      {children}
    </div>
  ),
  SheetContent: ({ children }: { children: ReactNode }) => (
    <div data-slot="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  SheetFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetClose: () => null,
  SheetTrigger: () => null,
  SheetPortal: ({ children }: { children: ReactNode }) => <>{children}</>,
  SheetOverlay: () => null,
};

export const alertDialogMock = {
  AlertDialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open?: boolean;
    onOpenChange?: OpenChangeHandler;
    children: ReactNode;
  }) => (
    <AlertDialogOpenChangeContext.Provider value={onOpenChange}>
      <div
        data-slot="alert-dialog"
        data-open={String(open)}
        role={open ? 'alertdialog' : undefined}
        aria-label={open ? 'Alert' : undefined}
      >
        {children}
      </div>
    </AlertDialogOpenChangeContext.Provider>
  ),
  AlertDialogContent: ({ children }: { children: ReactNode }) => (
    <div data-slot="alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: ReactNode }) => (
    <h2>{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogCancel: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: MouseEventHandler<HTMLButtonElement>;
  }) => {
    const onOpenChange = useContext(AlertDialogOpenChangeContext);
    return (
      <button
        type="button"
        onClick={(event) => {
          onClick?.(event);
          onOpenChange?.(false);
        }}
      >
        {children}
      </button>
    );
  },
  AlertDialogAction: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogTrigger: () => null,
  AlertDialogPortal: ({ children }: { children: ReactNode }) => <>{children}</>,
  AlertDialogOverlay: () => null,
};
