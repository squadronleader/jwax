import { QueryResult } from '../engine/types';
import { OutputFormatter } from './types';

/**
 * JSON formatter - outputs results as JSON array
 * Converts QueryResult (headers + rows) into array of objects
 */
export class JsonFormatter implements OutputFormatter {
  format(result: QueryResult): string {
    const { headers, rows } = result;
    
    // Convert rows array to array of objects
    const objects = rows.map(row => {
      const obj: Record<string, any> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    return JSON.stringify(objects, null, 2);
  }
}
