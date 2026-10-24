'use client';

// Opts the grid out of React Compiler. Its parts read state through builder
// calls on rows, columns and headers that keep their identity across renders
// (row.getIsExpanded(), column.getIsResizing()); compiled, those reads are
// cached against the unchanged object and never run again. The grid memoizes
// by hand instead, and the component that renders it still compiles.
'use no memo';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { cn } from 'cn';
import type { DataGridFeatures } from '@/components/reui/data-grid/data-grid-features';
import type { ReactNode } from 'react';
import type {
  ColumnFiltersState,
  ReactTable,
  SortingState,
  Table,
  TableFeatures,
} from '@tanstack/react-table';
import {
  type DataGridI18nConfig,
  type DataGridI18nOverrides,
  mergeDataGridI18n,
} from '@/components/reui/data-grid/data-grid-i18n';

export type { DataGridFeatures };

/**
 * Per-column write contract for the spreadsheet operations (paste, fill,
 * clear, cut). Presence marks the column writable; every write still flows
 * through `onCellsChange`, so the consumer's state stays the only data owner.
 */
export interface DataGridColumnCellEdit<TData> {
  /**
   * Set false for a column that formats clipboard output but is never
   * written; a function decides per row, so locked rows (archived, another
   * user's, a totals row) reject like any read-only cell. Defaults to true.
   */
  editable?: boolean | ((row: TData) => boolean);
  /**
   * Clipboard or fill string to typed value. Return undefined to reject the
   * cell into `rejected`. Without it the raw string passes through unchanged -
   * a deliberate non-coercion, so a number column receives strings only when
   * the consumer chose not to parse.
   */
  parse?: (raw: string, row: TData) => unknown;
  /** Typed value to clipboard string. Fallback: String(value ?? ""). */
  format?: (value: unknown, row: TData) => string;
  /** Value dispatched by Delete/Backspace and cut. Defaults to null. */
  clearValue?: unknown;
  /**
   * Opt into the grid's built-in free-text editor: an overlay input (or
   * auto-growing textarea) flush over the focused cell, opened by Enter, F2,
   * typing, or double-click, committing through `onCellsChange` as source
   * `"edit"` with `parse` applied. Columns without it stay consumer-edited
   * via `onCellEditRequest` or their own cell renderers.
   */
  control?: 'text' | 'textarea';
}

export interface DataGridColumnMeta<TData> {
  headerTitle?: string;
  headerClassName?: string;
  cellClassName?: string;
  skeleton?: ReactNode;
  expandedContent?: (row: TData) => ReactNode;
  autoSize?: boolean;
  /** Header spans this many leaves: this one and its next adjacent siblings. */
  headerColSpan?: number;
  cellEdit?: DataGridColumnCellEdit<TData>;
  /**
   * Under `columnsResizable`, this column absorbs the free space the filler
   * strip would otherwise hold, so the grid always reads full-width and the
   * built-in editor covers the whole cell. One column per grid; while free
   * space remains, manual resizing of this column is visually a no-op (the
   * absorbed space compensates), the flex-column trade-off.
   */
  fillWidth?: boolean;
}

/**
 * The grid's internal view of the table.
 *
 * `TFeatures` is invariant in v9 and an unresolved generic one collapses to a
 * union that includes the bare core arm, so no generic signature can call
 * `getVisibleCells()`, `getStartVisibleLeafColumns()` and friends. The public
 * components stay generic so consumers can pass any bundle they like; the
 * table is widened to this concrete type exactly once, on the way into
 * context, and every internal component reads it from there.
 */
export type DataGridTableInstance<TData extends object> = ReactTable<
  DataGridFeatures,
  TData
>;

export type DataGridApiFetchParams = {
  pageIndex: number;
  pageSize: number;
  sorting?: SortingState;
  filters?: ColumnFiltersState;
  searchQuery?: string;
};

export type DataGridApiResponse<T> = {
  data: T[];
  empty: boolean;
  pagination: {
    total: number;
    page: number;
  };
};

/**
 * Everything `<DataGrid>` accepts except the two props the provider consumes
 * itself. Kept feature-agnostic: layout and messaging never depend on which
 * TanStack features the consumer registered.
 */
export type DataGridLayoutProps<TData extends object> = Omit<
  DataGridProps<TableFeatures, TData>,
  'table' | 'children'
>;

export interface DataGridContextProps<TData extends object> {
  props: DataGridLayoutProps<TData>;
  table: DataGridTableInstance<TData>;
  recordCount: number;
  isLoading: boolean;
  /** Stable per-grid prefix for the DOM ids ARIA relations point at. */
  gridId: string;
  /** The merged label set; components read `i18n.labels.<key>`. */
  i18n: DataGridI18nConfig;
  /**
   * Internal coordinator for `meta.autoSize` columns. Lives at the core level
   * so every table variant and viewport instance shares one application state.
   */
  autoSize?: DataGridAutoSizeController;
}

export type DataGridAutoSizeController = {
  /**
   * Feeds the controller one viewport measurement: the SIGNED free space
   * between the scroll container and the table, negative while the table
   * overflows. The first sight of a `meta.autoSize` column absorbs the
   * free space into its width; after that, every measurement REFLOWS the
   * same growth - a wider window widens the column, a narrower one gives
   * the space back down to the column's `minSize` (or its starting width
   * when none is set) - so the grid tracks its container live. Commits
   * are coalesced for performance: sub-pixel deltas are dropped, a
   * streaming resize gets one leading commit plus one trailing commit at
   * settle, and a width the user dragged is never touched. Safe to call
   * from every viewport measurement; returns true when a sizing update
   * was dispatched.
   */
  apply: (freeSpace: number) => boolean;
  /**
   * The width the armed column would reflow to at this free space, and the
   * width it holds now, without committing anything. Null when no column is
   * armed. A live (onChange) resize previews with it on every move.
   */
  preview: (
    freeSpace: number
  ) => { columnId: string; current: number; size: number } | null;
  /**
   * Records a width the caller commits for the armed column, so the next
   * measurement reads it as this coordinator's own write and keeps
   * reflowing, rather than as a user drag that stands it down.
   */
  adopt: (columnId: string, size: number) => void;
};

type DataGridAutoSizeReflowState = {
  applied: { columnId: string; base: number; grown: number } | null;
  settleTimer: ReturnType<typeof setTimeout> | null;
  pendingFreeSpace: number;
  lastCommitAt: number;
};

/**
 * Bookkeeping keyed on the TABLE STORE, never on a React instance: dev
 * StrictMode double-mounts the tree, so two controller instances serve one
 * page and only the first would remember what it absorbed - the second
 * reads the grown width as a user drag and freezes the column. The store
 * object is the one identity that provably survives that dance (the
 * absorbed sizing rides inside it), and the WeakMap lets a discarded
 * table take its bookkeeping with it.
 */
const dataGridAutoSizeStates = new WeakMap<
  object,
  DataGridAutoSizeReflowState
>();

const getDataGridAutoSizeState = (
  store: object
): DataGridAutoSizeReflowState => {
  let state = dataGridAutoSizeStates.get(store);
  if (!state) {
    state = {
      applied: null,
      settleTimer: null,
      pendingFreeSpace: 0,
      lastCommitAt: 0,
    };
    dataGridAutoSizeStates.set(store, state);
  }
  return state;
};

const readLiveColumnSizing = <TData extends object>(
  table: DataGridTableInstance<TData>
) => table.atoms.columnSizing?.get() ?? table.state.columnSizing;

type DataGridColumnSizing = NonNullable<
  ReturnType<typeof readLiveColumnSizing>
>;

const userResizedSinceGrowth = (
  columnSizing: DataGridColumnSizing,
  columnId: string,
  grown: number | undefined
) => {
  const currentSize = columnSizing[columnId];
  return currentSize !== undefined && currentSize !== grown;
};

const autoSizeEntryWasCleared = (
  columnSizing: DataGridColumnSizing,
  columnId: string
) => columnSizing[columnId] === undefined;

const growthToRevertIfStillOurs = (
  applied: DataGridAutoSizeReflowState['applied'],
  columnSizing: DataGridColumnSizing
) =>
  applied && columnSizing[applied.columnId] === applied.grown ? applied : null;

const createDataGridAutoSizeController = <TData extends object>(
  getTable: () => DataGridTableInstance<TData>
): DataGridAutoSizeController => {
  const SETTLE_MS = 150;

  const resolveReflow = (freeSpace: number) => {
    const table = getTable();
    const state = getDataGridAutoSizeState(table.store);
    // LIVE state, never the render snapshot: a measurement can run between
    // our own sizing commit and React's re-render, and the stale snapshot
    // would hide the width this controller just wrote.
    const columnSizing = readLiveColumnSizing(table);
    if (!state.applied) return null;
    const autoSizeColumn = table
      .getVisibleLeafColumns()
      .find(
        (column) => column.columnDef.meta?.autoSize && column.getCanResize()
      );
    if (!autoSizeColumn || autoSizeColumn.id !== state.applied.columnId)
      return null;
    if (
      userResizedSinceGrowth(
        columnSizing,
        state.applied.columnId,
        state.applied.grown
      )
    ) {
      return null;
    }
    // The free space as it would measure with our growth removed; the
    // target re-absorbs exactly that, floored at minSize so a narrow
    // window hands space back without ever crushing the column (no
    // explicit minSize floors at the starting width instead). The resolved
    // columnDef always carries TanStack's built-in minSize (20), so only a
    // value that differs from the defaults, or a defaultColumn.minSize,
    // counts as one the consumer set.
    const freeAtBase = freeSpace + (state.applied.grown - state.applied.base);
    const resolvedMinSize = autoSizeColumn.columnDef.minSize;
    const hasConsumerMinSize =
      table.options.defaultColumn?.minSize !== undefined ||
      resolvedMinSize !== table.getDefaultColumnDef().minSize;
    const floor =
      hasConsumerMinSize && resolvedMinSize !== undefined
        ? resolvedMinSize
        : state.applied.base;
    const target = Math.max(floor, state.applied.base + freeAtBase);
    return {
      table,
      state,
      applied: state.applied,
      target,
      // Always set on a resolved columnDef (MAX_SAFE_INTEGER by default).
      maxSize: autoSizeColumn.columnDef.maxSize!,
    };
  };

  const reflow = (freeSpace: number): boolean => {
    const resolved = resolveReflow(freeSpace);
    if (!resolved) return false;
    const { table, state, applied, target } = resolved;
    if (Math.abs(target - applied.grown) < 1) return false;
    state.applied = { ...applied, grown: target };
    table.setColumnSizing((old) => ({
      ...old,
      [applied.columnId]: target,
    }));
    return true;
  };

  const coalesceReflow = (
    state: DataGridAutoSizeReflowState,
    freeSpace: number
  ) => {
    state.pendingFreeSpace = freeSpace;
    const now = Date.now();
    if (now - state.lastCommitAt > SETTLE_MS) {
      state.lastCommitAt = now;
      return reflow(freeSpace);
    }
    if (state.settleTimer !== null) clearTimeout(state.settleTimer);
    state.settleTimer = setTimeout(() => {
      state.settleTimer = null;
      state.lastCommitAt = Date.now();
      reflow(state.pendingFreeSpace);
    }, SETTLE_MS);
    return false;
  };

  return {
    preview(freeSpace: number) {
      const resolved = resolveReflow(freeSpace);
      // In rendered pixels: getSize() clamps to maxSize, so an unclamped
      // preview painted a capped column past its cap until the release.
      return resolved
        ? {
            columnId: resolved.applied.columnId,
            current: Math.min(resolved.applied.grown, resolved.maxSize),
            size: Math.min(resolved.target, resolved.maxSize),
          }
        : null;
    },
    adopt(columnId: string, size: number) {
      const state = getDataGridAutoSizeState(getTable().store);
      if (state.applied?.columnId === columnId) {
        state.applied = { ...state.applied, grown: size };
      }
    },
    apply(freeSpace: number) {
      const table = getTable();
      const state = getDataGridAutoSizeState(table.store);
      const columnSizing = readLiveColumnSizing(table);

      if (
        state.applied &&
        autoSizeEntryWasCleared(columnSizing, state.applied.columnId)
      ) {
        state.applied = null;
      }

      const autoSizeColumn = table
        .getVisibleLeafColumns()
        .find(
          (column) => column.columnDef.meta?.autoSize && column.getCanResize()
        );

      if (autoSizeColumn && state.applied?.columnId === autoSizeColumn.id) {
        return coalesceReflow(state, freeSpace);
      }

      const fillWidth = Math.max(0, freeSpace);
      if (fillWidth <= 0) return false;

      if (!autoSizeColumn) {
        return false;
      }

      if (
        userResizedSinceGrowth(
          columnSizing,
          autoSizeColumn.id,
          state.applied?.grown
        )
      ) {
        return false;
      }

      const revert = growthToRevertIfStillOurs(state.applied, columnSizing);
      const base = columnSizing[autoSizeColumn.id] ?? autoSizeColumn.getSize();
      const grown = base + fillWidth;

      state.applied = { columnId: autoSizeColumn.id, base, grown };
      table.setColumnSizing((old) => {
        const next = { ...old, [autoSizeColumn.id]: grown };
        if (revert && next[revert.columnId] === revert.grown) {
          next[revert.columnId] = revert.base;
        }
        return next;
      });

      return true;
    },
  };
};

export type DataGridRequestParams = {
  pageIndex: number;
  pageSize: number;
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
};

/** Which spreadsheet operation produced a cell change batch. */
export type DataGridCellsChangeSource =
  | 'paste'
  | 'cut'
  | 'clear'
  | 'fill'
  | 'edit';

export interface DataGridCellChange<TData> {
  rowId: string;
  columnId: string;
  /** The consumer's row object, so immutable write-back needs no second lookup. */
  row: TData;
  /** Accessor value at dispatch time; enables consumer-side undo stacks. */
  previousValue: unknown;
  /** Typed value produced by `meta.cellEdit.parse`, or `clearValue` for clear/cut. */
  value: unknown;
}

/** What onCellsCopy receives after the grid writes the clipboard. */
export interface DataGridCopyDetails {
  /** The TSV text that reached the clipboard. */
  text: string;
  /** The same content as a row-major grid of formatted fields. */
  grid: string[][];
  /** True when the write came from a cut, which clears the region next. */
  cut: boolean;
}

/** One resolved positive region, in pre-paginated display indexes. */
export interface DataGridCellSelectionBound {
  minRowIndex: number;
  maxRowIndex: number;
  minColumnIndex: number;
  maxColumnIndex: number;
}

/** What onCellSelectionChange receives, resolved from the live selection. */
export interface DataGridCellSelectionSnapshot {
  /** The virtually focused cell, the active range's anchor. Null when clear. */
  focused: { rowId: string; columnId: string } | null;
  /** Every positive region, geometric order. */
  bounds: DataGridCellSelectionBound[];
  /** The most recent region, the one copy and paste act on. */
  activeBound: DataGridCellSelectionBound | null;
  /**
   * Cells of the selection the view can show - the count that matches the
   * painted range and what a batch will touch.
   */
  visibleCellCount: number;
}

export interface DataGridCellRejection {
  rowId: string;
  columnId: string;
  raw: string;
  reason: 'readonly' | 'invalid';
}

/**
 * Lifecycle of a row for the optional CRUD indications: "new" and "dirty"
 * tint the row, "deleted" mutes and strikes it. Purely presentational - the
 * consumer's state stays the only owner of what the statuses mean.
 */
export type DataGridRowStatus = 'new' | 'dirty' | 'deleted';

/**
 * Lifecycle of a cell for the optional CRUD indications: a corner mark in
 * the amber tone for "dirty", the destructive tone for "invalid".
 */
export type DataGridCellStatus = 'dirty' | 'invalid';

/**
 * Asks the consumer to open its editor for the focused cell: Enter or F2, or
 * a typed printable character (then `initialText` carries it, the
 * Notion/Airtable type-to-replace flow). Dispatched only for cells whose
 * column is writable via `meta.cellEdit`.
 */
export interface DataGridCellEditRequest<TData> {
  rowId: string;
  columnId: string;
  row: TData;
  previousValue: unknown;
  /** The typed character that started the edit; absent for Enter and F2. */
  initialText?: string;
}

/**
 * One batch per operation, however many cells it spans: a 10k-cell paste is
 * one callback, one consumer setState, one table rebuild. The grid never
 * writes data itself.
 */
export interface DataGridCellsChangeDetails<TData> {
  source: DataGridCellsChangeSource;
  changes: DataGridCellChange<TData>[];
  rejected: DataGridCellRejection[];
}

export interface DataGridProps<
  TFeatures extends TableFeatures,
  TData extends object,
> {
  className?: string;
  table?: Table<TFeatures, TData>;
  recordCount: number;
  children?: ReactNode;
  onRowClick?: (row: TData) => void;
  /**
   * Receives every spreadsheet write batch (paste, cut, clear, fill, edit).
   * Served through the props getter like `onRowClick`, so an inline identity
   * never republishes the context. Absent: copy still works, writes no-op.
   */
  onCellsChange?: (details: DataGridCellsChangeDetails<TData>) => void;
  /**
   * Opens the consumer's editor from the keyboard: Enter, F2, or typing on
   * the focused cell. Absent: Enter keeps moving down, typing does nothing.
   */
  onCellEditRequest?: (request: DataGridCellEditRequest<TData>) => void;
  /**
   * Fires on every cell-selection change (focus moves, ranges grow or
   * clear) with a resolved snapshot, so a selection count, formula bar or
   * context panel needs no reach into TanStack internals.
   */
  onCellSelectionChange?: (snapshot: DataGridCellSelectionSnapshot) => void;
  /**
   * Fires after the grid writes the clipboard (Cmd/Ctrl+C or X, or the
   * native copy and cut events), e.g. to confirm with a toast.
   */
  onCellsCopy?: (details: DataGridCopyDetails) => void;
  /**
   * Renders an "Add row" affordance as the table body's last row; clicking
   * it is the consumer's cue to start creating a row. Absent: no row.
   */
  onRowCreate?: () => void;
  /** Label of the onRowCreate affordance. Defaults to "Add row". */
  rowCreateLabel?: ReactNode;
  /**
   * Rendered inside the table body after the data rows: the slot a DRAFT
   * row lives in while it is being created, before it joins `data` and the
   * pagination math. Supply a `<tr>` of cells; the colgroup sizes them.
   */
  appendRow?: ReactNode;
  /**
   * Optional CRUD indication per row. Return undefined for no indication;
   * omit the prop entirely to render none anywhere.
   */
  getRowStatus?: (row: TData) => DataGridRowStatus | undefined;
  /**
   * Optional CRUD indication per cell: the classic corner mark on cells the
   * consumer tracks as edited or invalid.
   */
  getCellStatus?: (
    row: TData,
    columnId: string
  ) => DataGridCellStatus | undefined;
  isLoading?: boolean;
  /**
   * Overrides for every built-in string: menu items, aria labels,
   * pagination copy, state messages. Merged over the defaults; a more
   * specific component prop (`rowCreateLabel`, `loadingMessage`, the
   * pagination label props) still wins over its `i18n` counterpart.
   */
  i18n?: DataGridI18nOverrides;
  loadingMode?: 'skeleton' | 'spinner';
  loadingMessage?: ReactNode | string;
  fetchingMoreMessage?: ReactNode | string;
  allRowsLoadedMessage?: ReactNode | string;
  emptyMessage?: ReactNode | string;
  tableLayout?: {
    dense?: boolean;
    cellBorder?: boolean;
    rowBorder?: boolean;
    rowRounded?: boolean;
    stripped?: boolean;
    headerBackground?: boolean;
    footerBackground?: boolean;
    headerBorder?: boolean;
    headerSticky?: boolean;
    width?: 'auto' | 'fixed';
    columnsVisibility?: boolean;
    columnsResizable?: boolean;
    columnsResizeMode?: 'onChange' | 'onEnd';
    columnsPinnable?: boolean;
    columnsMovable?: boolean;
    columnsDraggable?: boolean;
    rowsDraggable?: boolean;
    rowsPinnable?: boolean;
    /** Spreadsheet cell range selection: mouse ranges, keyboard, clipboard chrome. */
    cellSelection?: boolean;
    /**
     * "range" (default): drag, Shift and Ctrl/Cmd gestures and Shift+keys
     * grow multi-cell regions. "single": one focused cell only - every
     * gesture collapses to it and Ctrl/Cmd+A is inert.
     */
    cellSelectionMode?: 'single' | 'range';
    /** Drag-to-fill handle on the selection corner. Requires cellSelection. */
    cellFillHandle?: boolean;
    /**
     * How a cell opens its editor from the mouse: "dblclick" (default,
     * the spreadsheet standard - first click focuses, second edits) or
     * "click", opening the editor as soon as a plain click lands on the
     * focused cell; modifier clicks and drags still select.
     */
    cellEditMode?: 'dblclick' | 'click';
    /**
     * When true, committing an edit with Enter moves focus down (Shift+Enter
     * up), the Sheets and Excel convention. Off by default: the commit keeps
     * focus on the edited cell. Tab always commits and moves across.
     */
    cellEditEnterAdvance?: boolean;
    /**
     * The handle's look: "dot" is a solid primary dot kept inside the
     * cell corner; "ring" is the Sheets-style hollow circle riding the
     * corner point, clamped at the grid's own boundary; "square" is the
     * Excel-style solid square inside the corner. Default "dot".
     */
    cellFillHandleVariant?: 'dot' | 'ring' | 'square';
  };
  tableClassNames?: {
    base?: string;
    header?: string;
    headerRow?: string;
    headerSticky?: string;
    body?: string;
    bodyRow?: string;
    footer?: string;
    edgeCell?: string;
    /** Override the getRowStatus tints; defaults are the warning-muted set. */
    rowNew?: string;
    rowDirty?: string;
    rowDeleted?: string;
    /**
     * Override the pinned-row chrome (muted tint, boundary shadow). A grid
     * that pins a draft row for quick-create wants it to read as an active
     * row, not a muted one.
     */
    rowPinned?: string;
    /** The onRowCreate affordance row, e.g. to match the grid's row height. */
    rowCreate?: string;
    /** The fill handle, e.g. to restyle or resize it beyond the built-in variants. */
    cellFillHandle?: string;
  };
}

const DataGridContext = createContext<DataGridContextProps<any> | undefined>(
  undefined
);

/**
 * Reads the grid context. Pass `TData` from the calling component when the
 * table, a row or a cell is handed on to something typed against that row
 * shape: v9 declares `TData` invariant, so the default `any` no longer
 * unifies with a concrete row type the way it did on v8.
 */
const useDataGrid = <
  TData extends object = any,
>(): DataGridContextProps<TData> => {
  const context = useContext(DataGridContext) as
    | DataGridContextProps<TData>
    | undefined;
  if (!context) {
    throw new Error('useDataGrid must be used within a DataGridProvider');
  }
  return context;
};

type DataGridStateAtom<TValue> = {
  get: () => TValue;
  subscribe: (listener: () => void) => { unsubscribe: () => void };
};

const noopUnsubscribe = () => {};

/**
 * Re-renders the caller when one table state atom changes, without waiting
 * for a render from above. The context holds still while a column resize is
 * in flight (see DataGridProvider), and React Compiler caches a consumer's
 * `<DataGridTable />` element, so whatever a drag must keep live (the width
 * variables, the resize line and indicator) subscribes here. `select` must
 * return the slice itself or a primitive, or every write re-renders.
 */
const useDataGridAtom = <TValue, TSelected = TValue | undefined>(
  atom: DataGridStateAtom<TValue> | undefined,
  select: (value: TValue | undefined) => TSelected = (value) =>
    value as TSelected
): TSelected => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!atom) return noopUnsubscribe;
      const subscription = atom.subscribe(onChange);
      return () => subscription.unsubscribe();
    },
    [atom]
  );
  const getSnapshot = () => select(atom?.get());
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

const DATA_GRID_UNPUBLISHED_STATE = new Set([
  'cellSelection',
  'columnResizing',
]);

const isDataGridPropNode = (value: unknown) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  ('$$typeof' in value || Object.getPrototypeOf(value) !== Object.prototype);

const dataGridPropsSignatureReplacer = (_key: string, value: unknown) => {
  if (typeof value === 'function') return 'fn';
  if (isDataGridPropNode(value)) return 'node';
  return value;
};

const getDataGridStateInputs = <TData extends object>(
  table: DataGridTableInstance<TData>,
  props: DataGridLayoutProps<TData>,
  autoSize: DataGridAutoSizeController
): unknown[] => {
  const inputs: unknown[] = [
    autoSize,
    table.options.data,
    table.options.columns,
    JSON.stringify(props, dataGridPropsSignatureReplacer),
  ];
  for (const [key, slice] of Object.entries(table.state)) {
    if (!DATA_GRID_UNPUBLISHED_STATE.has(key)) inputs.push(key, slice);
  }
  return inputs;
};

const getDataGridCallbackInputs = <TData extends object>(
  props: DataGridLayoutProps<TData>
): unknown[] => {
  return Object.values(props).filter(
    (value) => typeof value === 'function' || isDataGridPropNode(value)
  );
};

const isSameDataGridInputs = (previous: unknown[], next: unknown[]) =>
  previous.length === next.length &&
  next.every((input, index) => Object.is(input, previous[index]));

const DataGridProvider = <TData extends object>({
  children,
  table,
  ...props
}: DataGridLayoutProps<TData> & {
  table: DataGridTableInstance<TData>;
  children?: ReactNode;
}) => {
  const gridId = useId();
  const i18n = mergeDataGridI18n(props.i18n);
  const [latest] = useState(() => ({ props, i18n, table }));
  latest.props = props;
  latest.i18n = i18n;
  latest.table = table;

  // Re-assert an explicit tableLayout resize mode so consumer-level useTable
  // options cannot flip it back between drags. v9 makes `table.options`
  // readonly, so this goes through setOptions in an effect rather than a
  // render-phase mutation. Without an explicit mode, the consumer's own
  // tanstack columnResizeMode (default "onEnd") is honored.
  const resizeMode =
    props.tableLayout?.columnsResizable && props.tableLayout.columnsResizeMode
      ? props.tableLayout.columnsResizeMode
      : undefined;

  useEffect(() => {
    if (!resizeMode) return;
    if (table.options.columnResizeMode === resizeMode) return;
    table.setOptions((old) => ({ ...old, columnResizeMode: resizeMode }));
  }, [table, resizeMode]);

  // With the selection UI on, every paste/fill/clear batch replaces `data`,
  // and the feature's default autoResetCellSelection would wipe the selection
  // after each write. Ranges are row-id based and unresolvable ids drop out
  // of the bounds safely, so keeping state across data edits is the correct
  // default here.
  const cellSelectionOn = !!props.tableLayout?.cellSelection;
  useEffect(() => {
    if (!cellSelectionOn || table.atoms.cellSelection == null) return;
    if (table.options.autoResetCellSelection === false) return;
    table.setOptions((old) => ({ ...old, autoResetCellSelection: false }));
  }, [table, cellSelectionOn]);

  const pageKey = `${table.state.pagination?.pageIndex}:${table.state.pagination?.pageSize}`;
  const previousPageKeyRef = useRef(pageKey);
  useEffect(() => {
    if (previousPageKeyRef.current === pageKey) return;
    previousPageKeyRef.current = pageKey;
    if (!cellSelectionOn || latest.table.atoms.cellSelection == null) return;
    latest.table.resetCellSelection(true);
  }, [pageKey, cellSelectionOn, latest]);

  // One autoSize coordinator per table instance so split header/body viewports
  // cannot apply the growth twice. Keyed on `table.store`, which v9 keeps
  // stable for the life of the table, rather than on `table` itself: the
  // wrapper is re-created on every state change, and re-creating the
  // controller with it would reset its applied-once bookkeeping mid-drag.
  const autoSize = useMemo(
    () => createDataGridAutoSizeController(() => latest.table),
    [latest, table.store]
  );

  // A new context value re-renders every useDataGrid reader, every cell
  // included, past any memo, and it is the only update a part gets when React
  // Compiler cached the element above it. The grid publishes one when a state
  // input changes. Callback inputs publish only for a consumer that memoizes
  // its useTable options, as the compiler does: its callbacks then change
  // only when they really change. A consumer that is not compiled builds new
  // options and new inline callbacks on every render, re-renders the grid
  // from above anyway, and would otherwise re-render every memoized virtual
  // row. Not the children's identity: the compiler caches the elements
  // inside children separately, so fresh children can wrap a cached table.
  // While a column resize is in flight the value holds still: the drag's own
  // visuals subscribe through useDataGridAtom, and the render after it
  // publishes what it changed.
  const committedOptionsRef = useRef(table.options);
  const hasMemoizedOptions = committedOptionsRef.current === table.options;
  useLayoutEffect(() => {
    committedOptionsRef.current = table.options;
  });
  const isResizing = !!table.state.columnResizing?.isResizingColumn;
  const publishedRef = useRef<{
    stateInputs: unknown[];
    callbackInputs: unknown[];
    value: DataGridContextProps<TData>;
  } | null>(null);
  let published = publishedRef.current;
  if (!published || !isResizing) {
    const stateInputs = getDataGridStateInputs(table, props, autoSize);
    const callbackInputs = getDataGridCallbackInputs(props);
    const stateChanged =
      !published || !isSameDataGridInputs(published.stateInputs, stateInputs);
    const callbacksChanged =
      !published ||
      !isSameDataGridInputs(published.callbackInputs, callbackInputs);
    if (published && !stateChanged && callbacksChanged && !hasMemoizedOptions) {
      published.callbackInputs = callbackInputs;
    } else if (stateChanged || callbacksChanged) {
      published = {
        stateInputs,
        callbackInputs,
        value: {
          get props() {
            return latest.props;
          },
          get table() {
            return latest.table;
          },
          get i18n() {
            return latest.i18n;
          },
          recordCount: props.recordCount,
          isLoading: props.isLoading || false,
          gridId,
          autoSize,
        },
      };
    }
  }
  const value = published!.value;

  useLayoutEffect(() => {
    publishedRef.current = published;
  });

  return (
    // One React context serves every TData, but v9 declares both TFeatures and
    // TData invariant, so a `DataGridContextProps<any>` context cannot accept a
    // `DataGridContextProps<TData>` value structurally. The erasure happens
    // here and is undone by the TData generic on each consumer component.
    <DataGridContext.Provider
      value={value as unknown as DataGridContextProps<TData>}
    >
      {children}
    </DataGridContext.Provider>
  );
};

const DataGrid = <TFeatures extends TableFeatures, TData extends object>({
  children,
  table,
  ...props
}: DataGridProps<TFeatures, TData>) => {
  const defaultProps: Partial<DataGridProps<TFeatures, TData>> = {
    loadingMode: 'skeleton',
    tableLayout: {
      dense: false,
      cellBorder: false,
      rowBorder: true,
      rowRounded: false,
      stripped: false,
      headerSticky: false,
      headerBackground: false,
      footerBackground: false,
      headerBorder: true,
      width: 'fixed',
      columnsVisibility: false,
      columnsResizable: false,
      columnsPinnable: false,
      columnsMovable: false,
      columnsDraggable: false,
      rowsDraggable: false,
      rowsPinnable: false,
      cellSelection: false,
      cellFillHandle: false,
    },
    tableClassNames: {
      base: '',
      header: '',
      headerRow: '',
      headerSticky: 'sticky top-0 z-40 bg-background/90 backdrop-blur-xs',
      body: '',
      bodyRow: '',
      footer: '',
      edgeCell: '',
    },
  };

  const mergedProps: DataGridProps<TFeatures, TData> = {
    ...defaultProps,
    ...props,
    tableLayout: {
      ...defaultProps.tableLayout,
      ...(props.tableLayout || {}),
    },
    tableClassNames: {
      ...defaultProps.tableClassNames,
      ...(props.tableClassNames || {}),
    },
  };

  if (!table) {
    throw new Error('DataGrid requires a "table" prop');
  }

  // The single widening point. Consumers own the TanStack core and may hand
  // over any feature bundle; internals need a concrete one to resolve the
  // feature-gated APIs they call, and v9's invariant TFeatures rules out
  // expressing that with a generic constraint.
  const internalTable = table as unknown as DataGridTableInstance<TData>;
  const internalProps = mergedProps as unknown as DataGridLayoutProps<TData>;

  return (
    <DataGridProvider table={internalTable} {...internalProps}>
      {children}
    </DataGridProvider>
  );
};

const DataGridContainer = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      data-slot="data-grid"
      className={cn('relative w-full overflow-hidden', className)}
    >
      {children}
    </div>
  );
};

export {
  useDataGrid,
  useDataGridAtom,
  DataGridProvider,
  DataGrid,
  DataGridContainer,
};
