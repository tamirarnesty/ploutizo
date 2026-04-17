// Wraps a raw <button> — NOT shadcn Button. Incompatible with Button base styles.
// Preserves swatch-specific accessibility: role="radio", aria-checked, aria-label (D-15/D-16).

interface SwatchButtonProps {
  colour: string // Tailwind bg-* class, e.g. "bg-slate-500"
  name: string // aria-label value
  checked: boolean // aria-checked value
  onClick: () => void
}

export const SwatchButton = ({ colour, name, checked, onClick }: SwatchButtonProps) => (
  <button
    type="button"
    role="radio"
    aria-checked={checked}
    aria-label={name}
    onClick={onClick}
    className={[
      `size-6 rounded ${colour} transition-all`,
      checked ? "ring-2 ring-primary ring-offset-2" : "hover:scale-110",
    ].join(" ")}
  />
)
