import type {
  DataGridScrollAreaOrientation,
  DataGridScrollAreaProps,
} from '@/components/reui/data-grid/data-grid-scroll-area-types';
import { DataGridScrollAreaLayout } from '@/components/reui/data-grid/data-grid-scroll-area-layout';
import { useDataGridScrollArea } from '@/components/reui/data-grid/use-data-grid-scroll-area';

const DataGridScrollArea = ({
  orientation = 'both',
  ...props
}: DataGridScrollAreaProps) => {
  const scrollArea = useDataGridScrollArea(orientation);

  return <DataGridScrollAreaLayout {...scrollArea} {...props} />;
};

export { DataGridScrollArea };
export type { DataGridScrollAreaOrientation, DataGridScrollAreaProps };
