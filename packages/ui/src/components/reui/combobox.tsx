"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { X as XIcon } from "lucide-react"
import { cn } from "@ploutizo/ui/lib/utils"

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ComboboxContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  value: string
  onValueChange: (value: string) => void
}

const ComboboxContext = React.createContext<ComboboxContextValue>({
  open: false,
  setOpen: () => {},
  value: "",
  onValueChange: () => {},
})

// ---------------------------------------------------------------------------
// Combobox root
// ---------------------------------------------------------------------------

interface ComboboxProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

function Combobox({ value = "", onValueChange, children }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      onValueChange?.(newValue)
      setOpen(false)
    },
    [onValueChange],
  )

  return (
    <ComboboxContext.Provider
      value={{ open, setOpen, value, onValueChange: handleValueChange }}
    >
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        {children}
      </PopoverPrimitive.Root>
    </ComboboxContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// ComboboxTrigger
// ---------------------------------------------------------------------------

function ComboboxTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return (
    <PopoverPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn(
        "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </PopoverPrimitive.Trigger>
  )
}

// ---------------------------------------------------------------------------
// ComboboxContent
// ---------------------------------------------------------------------------

function ComboboxContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="combobox-content"
        align="start"
        sideOffset={4}
        className={cn(
          "z-50 w-[var(--radix-popover-trigger-width)] min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

// ---------------------------------------------------------------------------
// ComboboxInput
// ---------------------------------------------------------------------------

interface ComboboxInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  onValueChange?: (value: string) => void
}

function ComboboxInput({
  className,
  onValueChange,
  ...props
}: ComboboxInputProps) {
  return (
    <div className="flex items-center border-b border-border px-3 pb-1 mb-1">
      <input
        data-slot="combobox-input"
        className={cn(
          "flex h-8 w-full bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        onChange={(e) => onValueChange?.(e.target.value)}
        {...props}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// ComboboxList
// ---------------------------------------------------------------------------

function ComboboxList({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="combobox-list"
      className={cn("max-h-56 overflow-y-auto", className)}
      role="listbox"
      {...props}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ComboboxItem
// ---------------------------------------------------------------------------

interface ComboboxItemProps extends React.ComponentProps<"button"> {
  value: string
}

function ComboboxItem({
  className,
  value,
  children,
  onClick,
  ...props
}: ComboboxItemProps) {
  const { onValueChange } = React.useContext(ComboboxContext)

  return (
    <button
      data-slot="combobox-item"
      type="button"
      role="option"
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      onClick={(e) => {
        onClick?.(e)
        onValueChange(value)
      }}
      {...props}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// ComboboxEmpty
// ---------------------------------------------------------------------------

function ComboboxEmpty({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="combobox-empty"
      className={cn("py-6 text-center text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  )
}

// ---------------------------------------------------------------------------
// ComboboxChips — flex-wrap anchor container; opens popover on click/focus
// ---------------------------------------------------------------------------

function ComboboxChips({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { setOpen } = React.useContext(ComboboxContext)
  return (
    <PopoverPrimitive.Anchor asChild>
      <div
        data-slot="combobox-chips"
        className={cn(
          "flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          className,
        )}
        onClick={() => setOpen(true)}
        {...props}
      >
        {children}
      </div>
    </PopoverPrimitive.Anchor>
  )
}

// ---------------------------------------------------------------------------
// ComboboxChip — individual chip inside ComboboxChips
// ---------------------------------------------------------------------------

interface ComboboxChipProps {
  children: React.ReactNode
  onRemove?: () => void
  className?: string
}

function ComboboxChip({ children, onRemove, className }: ComboboxChipProps) {
  return (
    <span
      data-slot="combobox-chip"
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground",
        className,
      )}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="rounded-sm opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Remove"
        >
          <XIcon size={10} aria-hidden="true" />
        </button>
      ) : null}
    </span>
  )
}

// ---------------------------------------------------------------------------
// ComboboxChipsInput — inline text input inside ComboboxChips
// ---------------------------------------------------------------------------

interface ComboboxChipsInputProps
  extends Omit<React.ComponentProps<"input">, "onChange"> {
  onValueChange?: (value: string) => void
}

function ComboboxChipsInput({
  className,
  onValueChange,
  ...props
}: ComboboxChipsInputProps) {
  const { setOpen } = React.useContext(ComboboxContext)
  return (
    <input
      data-slot="combobox-chips-input"
      className={cn(
        "min-w-[6rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
        className,
      )}
      onChange={(e) => onValueChange?.(e.target.value)}
      onFocus={() => setOpen(true)}
      {...props}
    />
  )
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
}
