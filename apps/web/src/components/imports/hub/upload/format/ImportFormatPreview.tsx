type ImportFormatPreviewProps = {
  columns: string[];
  sampleRows: string[][];
};

export const ImportFormatPreview = ({
  columns,
  sampleRows,
}: ImportFormatPreviewProps) => {
  if (sampleRows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-max text-left text-sm">
        <caption className="sr-only">CSV preview</caption>
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {columns.map((column) => (
              <th key={column} className="px-2 py-1.5 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sampleRows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border last:border-0">
              {columns.map((column, columnIndex) => (
                <td key={`${rowIndex}-${column}`} className="px-2 py-1.5">
                  {row[columnIndex] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
