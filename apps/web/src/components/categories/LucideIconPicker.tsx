import { useLayoutEffect, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
import { CachedLucideIcon } from '@/components/categories/CachedLucideIcon';
import {
  filterLucideKebabIconNames,
  kebabToPascal,
} from '@/components/categories/lucideIconNames';
import type { IconName } from 'lucide-react/dynamic';

const GRID_COLUMNS = 6;
const GRID_ROW_HEIGHT = 32;
const GRID_VIEWPORT_HEIGHT = 192;
const VIRTUALIZE_THRESHOLD = GRID_COLUMNS * 12;

interface LucideIconPickerProps {
  value: string | null;
  onChange: (iconName: string) => void;
}

const IconGridButton = ({
  kebabName,
  isSelected,
  onSelect,
}: {
  kebabName: IconName;
  isSelected: boolean;
  onSelect: (pascalName: string) => void;
}) => {
  const pascalName = kebabToPascal(kebabName);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            role="option"
            aria-selected={isSelected}
            aria-label={pascalName}
            onClick={() => onSelect(pascalName)}
            className={isSelected ? 'bg-primary/10 ring-2 ring-primary' : ''}
          />
        }
      >
        <CachedLucideIcon name={pascalName} size={18} />
      </TooltipTrigger>
      <TooltipContent>{pascalName}</TooltipContent>
    </Tooltip>
  );
};

const IconGridRow = ({
  rowIcons,
  selectedPascalName,
  onSelect,
}: {
  rowIcons: IconName[];
  selectedPascalName: string | null;
  onSelect: (pascalName: string) => void;
}) => (
  <div
    className="grid w-full grid-cols-6 gap-1"
    style={{ height: GRID_ROW_HEIGHT }}
  >
    {rowIcons.map((kebabName) => (
      <IconGridButton
        key={kebabName}
        kebabName={kebabName}
        isSelected={selectedPascalName === kebabToPascal(kebabName)}
        onSelect={onSelect}
      />
    ))}
  </div>
);

const VirtualizedIconGrid = ({
  iconNames: filteredKebabNames,
  selectedPascalName,
  onSelect,
}: {
  iconNames: IconName[];
  selectedPascalName: string | null;
  onSelect: (pascalName: string) => void;
}) => {
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null
  );
  const rowCount = Math.ceil(filteredKebabNames.length / GRID_COLUMNS);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollElement,
    estimateSize: () => GRID_ROW_HEIGHT,
    overscan: 3,
  });

  useLayoutEffect(() => {
    if (!scrollElement) return;
    virtualizer.measure();
  }, [scrollElement, filteredKebabNames.length, virtualizer]);

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div
      ref={setScrollElement}
      className="overflow-y-auto"
      style={{ height: GRID_VIEWPORT_HEIGHT }}
      role="listbox"
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualRows.length > 0 ? (
          virtualRows.map((virtualRow) => {
            const rowStart = virtualRow.index * GRID_COLUMNS;
            const rowIcons = filteredKebabNames.slice(
              rowStart,
              rowStart + GRID_COLUMNS
            );

            return (
              <div
                key={virtualRow.key}
                className="absolute top-0 left-0 w-full"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <IconGridRow
                  rowIcons={rowIcons}
                  selectedPascalName={selectedPascalName}
                  onSelect={onSelect}
                />
              </div>
            );
          })
        ) : (
          <IconGridRow
            rowIcons={filteredKebabNames.slice(0, GRID_COLUMNS)}
            selectedPascalName={selectedPascalName}
            onSelect={onSelect}
          />
        )}
      </div>
    </div>
  );
};

const LucideIconGrid = ({
  filteredKebabNames,
  selectedPascalName,
  onSelect,
}: {
  filteredKebabNames: IconName[];
  selectedPascalName: string | null;
  onSelect: (pascalName: string) => void;
}) => {
  const shouldVirtualize = filteredKebabNames.length > VIRTUALIZE_THRESHOLD;

  if (shouldVirtualize) {
    return (
      <VirtualizedIconGrid
        iconNames={filteredKebabNames}
        selectedPascalName={selectedPascalName}
        onSelect={onSelect}
      />
    );
  }

  return (
    <div
      className="overflow-y-auto"
      style={{ maxHeight: GRID_VIEWPORT_HEIGHT }}
      role="listbox"
    >
      <div className="grid grid-cols-6 gap-1">
        {filteredKebabNames.map((kebabName) => (
          <IconGridButton
            key={kebabName}
            kebabName={kebabName}
            isSelected={selectedPascalName === kebabToPascal(kebabName)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
};

export const LucideIconPicker = ({
  value,
  onChange,
}: LucideIconPickerProps) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filteredKebabNames = useMemo(
    () => filterLucideKebabIconNames(search),
    [search]
  );

  const handleSelect = (pascalName: string) => {
    onChange(pascalName);
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
            className="flex items-center gap-2"
            aria-haspopup="listbox"
            aria-expanded={open}
          />
        }
      >
        {value ? (
          <CachedLucideIcon name={value} size={16} />
        ) : (
          <Text as="span" variant="body-sm" className="text-muted-foreground">
            Select icon
          </Text>
        )}
        {value && (
          <Text as="span" variant="caption">
            {value}
          </Text>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2 p-3">
        <Input
          autoFocus // Picker opened by user action — autoFocus on search is intentional and expected
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search icons…"
        />
        {open && filteredKebabNames.length === 0 ? (
          <Text variant="caption" className="py-2 text-center">
            No icons match "{search}".
          </Text>
        ) : null}
        {open && filteredKebabNames.length > 0 ? (
          <LucideIconGrid
            filteredKebabNames={filteredKebabNames}
            selectedPascalName={value}
            onSelect={handleSelect}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
};
