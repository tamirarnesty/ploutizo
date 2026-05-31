import { COLOUR_SWATCHES } from '@ploutizo/validators';
import type { ColourToken } from '@ploutizo/validators';
import { getColourSwatchBgClass } from './colour-token-classes';
import { SwatchButton } from './SwatchButton';

interface ColourTokenPickerProps {
  value: ColourToken | null;
  onChange: (colour: ColourToken) => void;
  ariaLabel?: string;
}

export const ColourTokenPicker = ({
  value,
  onChange,
  ariaLabel = 'Category colour',
}: ColourTokenPickerProps) => (
  <div
    className="flex flex-wrap gap-2"
    role="radiogroup"
    aria-label={ariaLabel}
  >
    {COLOUR_SWATCHES.map(({ name, value: swatchValue }) => (
      <SwatchButton
        key={swatchValue}
        bgClass={getColourSwatchBgClass(swatchValue)}
        name={name}
        checked={value === swatchValue}
        onClick={() => onChange(swatchValue)}
      />
    ))}
  </div>
);
