import type { PointerEvent } from 'react';
import { cn } from '@/lib/utils';
import {
  dataGridCustomVerticalScrollbarThumbClassName,
  dataGridCustomVerticalScrollbarTrackClassName,
} from '@/components/reui/data-grid/data-grid-scroll-area-styles';

type DataGridScrollAreaCustomVerticalProps = {
  showCustomVerticalScrollbar: boolean;
  isCustomVerticalScrollbarActive: boolean;
  onTrackPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onThumbLostPointerCapture: () => void;
  onThumbPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onThumbPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onThumbPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onThumbPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
};

export const DataGridScrollAreaCustomVertical = ({
  showCustomVerticalScrollbar,
  isCustomVerticalScrollbarActive,
  onTrackPointerDown,
  onThumbLostPointerCapture,
  onThumbPointerCancel,
  onThumbPointerDown,
  onThumbPointerMove,
  onThumbPointerUp,
}: DataGridScrollAreaCustomVerticalProps) => (
  <div
    className={cn(
      'absolute inset-e-0 top-(--data-grid-scrollbar-header-height) z-20 h-(--data-grid-scrollbar-track-height)',
      'transition-opacity duration-200',
      showCustomVerticalScrollbar
        ? 'opacity-100'
        : 'pointer-events-none opacity-0'
    )}
  >
    <div
      data-orientation="vertical"
      data-scrolling={isCustomVerticalScrollbarActive ? '' : undefined}
      data-slot="data-grid-scrollbar"
      className={dataGridCustomVerticalScrollbarTrackClassName}
      onPointerDown={onTrackPointerDown}
    >
      <div
        className={cn(
          dataGridCustomVerticalScrollbarThumbClassName,
          'top-(--data-grid-scrollbar-thumb-top) h-(--data-grid-scrollbar-thumb-height)'
        )}
        onLostPointerCapture={onThumbLostPointerCapture}
        onPointerCancel={onThumbPointerCancel}
        onPointerDown={onThumbPointerDown}
        onPointerMove={onThumbPointerMove}
        onPointerUp={onThumbPointerUp}
      />
    </div>
  </div>
);
