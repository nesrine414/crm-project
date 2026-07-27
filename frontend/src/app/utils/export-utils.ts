/**
 * Utility function to export data as a CSV file compatible with Microsoft Excel.
 * Uses UTF-8 BOM and semicolon delimiter to ensure proper display of accents in Excel.
 *
 * @param filename - Name of the downloaded file (without extension)
 * @param headers - Array of column header labels
 * @param rows - 2D array of row data (string or number values)
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const escape = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Escape double quotes and wrap in quotes if contains delimiter, quotes, or newlines
    if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const headerLine = headers.map(escape).join(';');
  const dataLines = rows.map(row => row.map(escape).join(';'));
  const csvContent = [headerLine, ...dataLines].join('\r\n');

  // UTF-8 BOM prefix ensures Excel opens the file with correct encoding
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
