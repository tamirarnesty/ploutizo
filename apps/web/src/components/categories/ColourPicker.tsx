import { SwatchButton } from './SwatchButton';

const SWATCHES = [
  { name: 'Slate', value: 'slate-500', tw: 'bg-slate-500' },
  { name: 'Red', value: 'red-500', tw: 'bg-red-500' },
  { name: 'Orange', value: 'orange-500', tw: 'bg-orange-500' },
  { name: 'Amber', value: 'amber-500', tw: 'bg-amber-500' },
  { name: 'Yellow', value: 'yellow-500', tw: 'bg-yellow-500' },
  { name: 'Lime', value: 'lime-500', tw: 'bg-lime-500' },
  { name: 'Green', value: 'green-500', tw: 'bg-green-500' },
  { name: 'Teal', value: 'teal-500', tw: 'bg-teal-500' },
  { name: 'Cyan', value: 'cyan-500', tw: 'bg-cyan-500' },
  { name: 'Blue', value: 'blue-500', tw: 'bg-blue-500' },
  { name: 'Violet', value: 'violet-500', tw: 'bg-violet-500' },
  { name: 'Pink', value: 'pink-500', tw: 'bg-pink-500' },
] as const;

interface ColourPickerProps {
  value: string | null;
  onChange: (colour: string) => void;
}

export const ColourPicker = ({ value, onChange }: ColourPickerProps) => {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label="Category colour"
    >
      {SWATCHES.map(({ name, value: swatchValue, tw }) => (
        <SwatchButton
          key={swatchValue}
          colour={tw}
          name={name}
          checked={value === swatchValue}
          onClick={() => onChange(swatchValue)}
        />
      ))}
    </div>
  );
};
