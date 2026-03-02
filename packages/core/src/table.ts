/**
 * @deprecated Use the formatter module instead: import { createFormatter } from './formatter'
 * This function is kept for backward compatibility only.
 */
export function printTable(headers: string[], rows: any[][]) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Table = require('cli-table3');
    const table = new Table({ head: headers });
    for (const r of rows) table.push(r.map(c => c === null || c === undefined ? '' : String(c)));
    console.log(table.toString());
  } catch (e) {
    const widths = headers.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i] === null || r[i] === undefined ? '' : r[i]).length)));
    const pad = (s: string, w: number) => s + ' '.repeat(w - s.length);
    const headerLine = headers.map((h, i) => pad(h, widths[i])).join(' | ');
    const sep = widths.map(w => '-'.repeat(w)).join('-|-');
    console.log(headerLine);
    console.log(sep);
    for (const r of rows) {
      console.log(r.map((c, i) => pad(String(c === null || c === undefined ? '' : c), widths[i])).join(' | '));
    }
  }
}
