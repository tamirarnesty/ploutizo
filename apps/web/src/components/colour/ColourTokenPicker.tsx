import { useMemo, useState } from 'react';
import { COLOUR_SHADE_VALUES, COLOUR_SWATCHES } from '@ploutizo/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ploutizo/ui/components/popover';
import { Button } from '@ploutizo/ui/components/button';
import { Input } from '@ploutizo/ui/components/input';
import { Text } from '@ploutizo/ui/components/text';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import type { ColourSwatch, ColourToken } from '@ploutizo/types';
import { ColourTokenDot } from './ColourTokenDot';

const GRID_VIEWPORT_HEIGHT = 240;

const SWATCH_BY_TOKEN = new Map(
  COLOUR_SWATCHES.map((swatch) => [swatch.token, swatch])
);

type HueRow = { hue: string; label: string; swatches: ColourSwatch[] };

/** Matches display names, so "red", "300" and "red 300" (or "red-300") all narrow the grid. */
const filterHueRows = (search: string): HueRow[] => {
  const query = search
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, ' ');
  const rows = new Map<string, HueRow>();
  for (const swatch of COLOUR_SWATCHES) {
    if (query && !swatch.name.toLowerCase().includes(query)) continue;
    const row = rows.get(swatch.hue) ?? {
      hue: swatch.hue,
      label: swatch.name.split(' ')[0],
      swatches: [],
    };
    row.swatches.push(swatch);
    rows.set(swatch.hue, row);
  }
  return [...rows.values()];
};

interface ColourTokenPickerProps {
  value: ColourToken;
  onChange: (colour: ColourToken) => void;
  ariaLabel?: string;
}

const SwatchGridButton = ({
  swatch,
  isSelected,
  onSelect,
}: {
  swatch: ColourSwatch;
  isSelected: boolean;
  onSelect: (token: ColourToken) => void;
}) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          role="option"
          aria-selected={isSelected}
          aria-label={swatch.name}
          onClick={() => onSelect(swatch.token)}
          className={isSelected ? 'bg-primary/10 ring-2 ring-primary' : ''}
          // Keep each shade in its own column when search filters a row.
          style={{
            gridColumnStart: COLOUR_SHADE_VALUES.indexOf(swatch.shade) + 2,
          }}
        />
      }
    >
      <ColourTokenDot token={swatch.token} className="size-5 rounded-sm" />
    </TooltipTrigger>
    <TooltipContent>{swatch.name}</TooltipContent>
  </Tooltip>
);

export const ColourTokenPicker = ({
  value,
  onChange,
  ariaLabel = 'Category colour',
}: ColourTokenPickerProps) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const hueRows = useMemo(() => filterHueRows(search), [search]);
  const selectedName = SWATCH_BY_TOKEN.get(value)?.name;

  const handleSelect = (token: ColourToken) => {
    onChange(token);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch('');
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2 self-start"
            aria-label={`${ariaLabel}: ${selectedName}`}
            aria-haspopup="listbox"
            aria-expanded={open}
          />
        }
      >
        <ColourTokenDot token={value} />
        <Text as="span" variant="caption">
          {selectedName}
        </Text>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2 p-3">
        <Input
          autoFocus // Picker opened by user action — autoFocus on search is intentional and expected
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search colours…"
          aria-label="Search colours"
        />
        {open && hueRows.length === 0 ? (
          <Text variant="caption" className="py-2 text-center">
            No colours match "{search}".
          </Text>
        ) : null}
        {open && hueRows.length > 0 ? (
          <div
            className="space-y-1 overflow-y-auto"
            style={{ maxHeight: GRID_VIEWPORT_HEIGHT }}
            role="listbox"
            aria-label={ariaLabel}
          >
            {hueRows.map((row) => (
              <div
                key={row.hue}
                role="group"
                aria-label={row.label}
                className="grid grid-cols-[4rem_repeat(5,minmax(0,1fr))] items-center gap-1"
              >
                <Text as="span" variant="caption">
                  {row.label}
                </Text>
                {row.swatches.map((swatch) => (
                  <SwatchGridButton
                    key={swatch.token}
                    swatch={swatch}
                    isSelected={swatch.token === value}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};
