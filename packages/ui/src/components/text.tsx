import * as React from "react"

import { cn } from "@ploutizo/ui/lib/utils"

export type TextAs = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div" | "label"
export type TextVariant = "h1" | "h2" | "h3" | "body" | "body-sm" | "caption" | "label" | "error"

const variantClasses: Record<TextVariant, string> = {
  h1: "font-heading text-3xl font-semibold tracking-tight leading-tight",
  h2: "font-heading text-2xl font-semibold tracking-tight leading-tight",
  h3: "font-heading text-xl font-semibold leading-snug",
  body: "text-base leading-relaxed",
  "body-sm": "text-sm leading-relaxed",
  caption: "text-xs text-muted-foreground leading-normal",
  label: "text-sm font-medium leading-none",
  error: "text-xs text-destructive leading-normal",
}

// Distributive conditional ensures ComponentPropsWithoutRef<T> resolves per-element
// (not collapsed to an intersection of all union members), preserving element-specific
// props like htmlFor on as="label".
type TextProps<T extends TextAs = "p"> = T extends TextAs
  ? {
      as?: T
      variant?: TextVariant
      className?: string
      ref?: React.Ref<React.ComponentRef<T>>
      children?: React.ReactNode
    } & Omit<React.ComponentPropsWithoutRef<T>, "as" | "variant" | "className" | "ref" | "children">
  : never

function Text<T extends TextAs = "p">({
  as,
  variant = "body",
  className,
  ref,
  ...props
}: TextProps<T>) {
  const Tag = (as ?? "p") as React.ElementType
  return (
    <Tag
      ref={ref}
      className={cn(variantClasses[variant], className)}
      {...props}
    />
  )
}

export { Text }
