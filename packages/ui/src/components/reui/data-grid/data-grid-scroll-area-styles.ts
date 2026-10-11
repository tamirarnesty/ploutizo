import { cn } from '@/lib/utils';

/** WCAG 2.2 1.4.11 non-text contrast: thumb vs track >= 3:1. */
export const dataGridForcedColorsThumbClassName = cn(
  'forced-colors:border forced-colors:border-[CanvasText]',
  'forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]',
  'forced-colors:hover:bg-[Highlight] forced-colors:active:bg-[Highlight]'
);

export const dataGridVerticalScrollbarTrackClassName = cn(
  'h-full w-2 border-s border-s-transparent bg-muted/25 dark:bg-muted/40'
);

export const dataGridScrollbarThumbAppearanceClassName = cn(
  'rounded-full transition-colors duration-150',
  'bg-muted-foreground/50 dark:bg-muted-foreground/60',
  'hover:bg-muted-foreground/65 dark:hover:bg-muted-foreground/75',
  'active:bg-muted-foreground/75 dark:active:bg-muted-foreground/85',
  'group-data-[scrolling]/scrollbar:bg-muted-foreground/70 dark:group-data-[scrolling]/scrollbar:bg-muted-foreground/85',
  dataGridForcedColorsThumbClassName
);

export const dataGridBaseUiScrollbarClassName = cn(
  'group/scrollbar flex touch-none p-px select-none',
  'opacity-0 transition-opacity duration-200',
  'data-[scrolling]:opacity-100',
  'data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:border-t data-[orientation=horizontal]:border-t-transparent',
  'data-[orientation=horizontal]:bg-muted/25 dark:data-[orientation=horizontal]:bg-muted/40',
  'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2 data-[orientation=vertical]:flex-col',
  'data-[orientation=vertical]:border-s data-[orientation=vertical]:border-s-transparent',
  'data-[orientation=vertical]:bg-muted/25 dark:data-[orientation=vertical]:bg-muted/40'
);

export const dataGridBaseUiScrollbarThumbClassName = cn(
  'relative flex-1',
  dataGridScrollbarThumbAppearanceClassName
);

export const dataGridCustomVerticalScrollbarTrackClassName = cn(
  'group/scrollbar relative flex touch-none flex-col p-px select-none',
  dataGridVerticalScrollbarTrackClassName
);

export const dataGridCustomVerticalScrollbarThumbClassName = cn(
  'absolute inset-x-px',
  dataGridScrollbarThumbAppearanceClassName
);
