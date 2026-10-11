export const DATA_GRID_ROW_ID_ATTR = 'data-grid-row-id';

/** Stamped on body and expanded `<tr>` when `renderRowContextMenu` is enabled. */
export const getDataGridRowContextMenuRowProps = (rowId: string) => ({
  [DATA_GRID_ROW_ID_ATTR]: rowId,
});
