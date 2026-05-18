/** Quote a single CSV field, escaping embedded quotes/commas/newlines. */
function quoteField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Quote when the field contains a comma, quote, CR, or LF.
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Encode an array of rows as a CSV string.
 *
 * Output includes a UTF-8 BOM so Excel/Numbers display Vietnamese diacritics
 * correctly out of the box.
 */
export function encodeCsv(
  header: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>,
): string {
  const lines: string[] = [];
  lines.push(header.map(quoteField).join(","));
  for (const row of rows) {
    lines.push(row.map(quoteField).join(","));
  }
  // BOM first; CRLF line endings for maximum spreadsheet compatibility.
  return "﻿" + lines.join("\r\n");
}
