import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';
import type { PointerEvent, ReactNode, RefObject } from 'react';
import type { DataGridScrollAreaProps } from '@/components/reui/data-grid/data-grid-scroll-area-types';
import { DataGridScrollAreaCustomVertical } from '@/components/reui/data-grid/data-grid-scroll-area-custom-vertical';
import {
  dataGridBaseUiScrollbarClassName,
  dataGridBaseUiScrollbarThumbClassName,
} from '@/components/reui/data-grid/data-grid-scroll-area-styles';
import { cn } from '@/lib/utils';

type DataGridScrollAreaLayoutProps = DataGridScrollAreaProps & {
  containerRef: RefObject<HTMLDivElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
  showHorizontal: boolean;
  showVertical: boolean;
  showCorner: boolean;
  usesCustomVerticalScrollbar: boolean;
  hasCustomVerticalOverflow: boolean;
  showCustomVerticalScrollbar: boolean;
  isCustomVerticalScrollbarActive: boolean;
  isNearHorizontalEdge: boolean;
  isNearVerticalEdge: boolean;
  handleContainerPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  handleContainerPointerLeave: () => void;
  clearDragState: () => void;
  handleTrackPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handleThumbPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  handleThumbPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handleThumbPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
};

export const DataGridScrollAreaLayout = ({
  children,
  className,
  containerRef,
  viewportRef,
  showHorizontal,
  showVertical,
  showCorner,
  usesCustomVerticalScrollbar,
  hasCustomVerticalOverflow,
  showCustomVerticalScrollbar,
  isCustomVerticalScrollbarActive,
  isNearHorizontalEdge,
  isNearVerticalEdge,
  handleContainerPointerMove,
  handleContainerPointerLeave,
  clearDragState,
  handleTrackPointerDown,
  handleThumbPointerUp,
  handleThumbPointerDown,
  handleThumbPointerMove,
  ...props
}: DataGridScrollAreaLayoutProps) => (
  <div
    ref={containerRef}
    className="relative"
    onPointerLeave={handleContainerPointerLeave}
    onPointerMove={handleContainerPointerMove}
  >
    <ScrollAreaPrimitive.Root
      data-slot="data-grid-scroll-area"
      className={cn('relative', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className="size-full"
      >
        <ScrollAreaPrimitive.Content data-slot="scroll-area-content">
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>

      {showHorizontal && (
        <ScrollAreaPrimitive.Scrollbar
          data-slot="data-grid-scrollbar"
          data-orientation="horizontal"
          orientation="horizontal"
          className={cn(
            dataGridBaseUiScrollbarClassName,
            isNearHorizontalEdge && 'opacity-100'
          )}
        >
          <ScrollAreaPrimitive.Thumb
            data-slot="data-grid-thumb"
            className={dataGridBaseUiScrollbarThumbClassName}
          />
        </ScrollAreaPrimitive.Scrollbar>
      )}

      {showVertical && !usesCustomVerticalScrollbar && (
        <ScrollAreaPrimitive.Scrollbar
          data-slot="data-grid-scrollbar"
          data-orientation="vertical"
          orientation="vertical"
          className={cn(
            dataGridBaseUiScrollbarClassName,
            isNearVerticalEdge && 'opacity-100'
          )}
        >
          <ScrollAreaPrimitive.Thumb
            data-slot="data-grid-thumb"
            className={dataGridBaseUiScrollbarThumbClassName}
          />
        </ScrollAreaPrimitive.Scrollbar>
      )}

      {showCorner && (
        <ScrollAreaPrimitive.Corner data-slot="data-grid-scroll-corner" />
      )}
    </ScrollAreaPrimitive.Root>

    {usesCustomVerticalScrollbar && hasCustomVerticalOverflow && (
      <DataGridScrollAreaCustomVertical
        showCustomVerticalScrollbar={showCustomVerticalScrollbar}
        isCustomVerticalScrollbarActive={isCustomVerticalScrollbarActive}
        onTrackPointerDown={handleTrackPointerDown}
        onThumbLostPointerCapture={clearDragState}
        onThumbPointerCancel={handleThumbPointerUp}
        onThumbPointerDown={handleThumbPointerDown}
        onThumbPointerMove={handleThumbPointerMove}
        onThumbPointerUp={handleThumbPointerUp}
      />
    )}
  </div>
);
