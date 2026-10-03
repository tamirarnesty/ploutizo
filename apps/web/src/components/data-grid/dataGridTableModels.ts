import { getCoreRowModel } from '@tanstack/react-table';

/** Stable row model for `useReactTable` — do not call `getCoreRowModel()` per render. */
export const dataGridCoreRowModel = getCoreRowModel();
