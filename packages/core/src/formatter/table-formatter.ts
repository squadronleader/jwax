import { QueryResult } from '../engine/types';
import { OutputFormatter } from './types';

/**
 * Table formatter - outputs results as ASCII tables
 * Extracted from src/table.ts for pluggable formatting
 */
export class TableFormatter implements OutputFormatter {
  format(result: QueryResult): string {
    const { headers, rows } = result;
    
    try {
      // Try to use cli-table3 if available
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Table = require('cli-table3');
      const table = new Table({ head: headers });
      for (const r of rows) {
        table.push(r.map(c => c === null || c === undefined ? '' : String(c)));
      }
      return table.toString();
    } catch (e) {
      // Fallback to simple table formatting
      return this.formatFallback(headers, rows);
    }
  }

  private formatFallback(headers: string[], rows: any[][]): string {
    const widths = headers.map((h, i) => 
      Math.max(
        h.length, 
        ...rows.map(r => String(r[i] === null || r[i] === undefined ? '' : r[i]).length)
      )
    );
    
    const pad = (s: string, w: number) => s + ' '.repeat(w - s.length);
    const headerLine = headers.map((h, i) => pad(h, widths[i])).join(' | ');
    const sep = widths.map(w => '-'.repeat(w)).join('-|-');
    
    const lines = [headerLine, sep];
    for (const r of rows) {
      lines.push(
        r.map((c, i) => pad(String(c === null || c === undefined ? '' : c), widths[i])).join(' | ')
      );
    }
    
    return lines.join('\n');
  }
}
