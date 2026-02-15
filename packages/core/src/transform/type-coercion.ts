/**
 * Type Coercion
 * Convert JSON values to SQL-compatible types
 */

import { ColumnDef } from '../engine/types';

export function coerceValue(value: any, targetType: ColumnDef['type']): any {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return null;
  }

  switch (targetType) {
    case 'INTEGER':
      if (typeof value === 'boolean') {
        return value ? 1 : 0;
      }
      if (typeof value === 'number') {
        return Math.floor(value);
      }
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? null : parsed;
      }
      return null;

    case 'REAL':
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
      }
      return null;

    case 'TEXT':
      if (typeof value === 'string') {
        return value;
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);

    case 'BLOB':
      return value;

    case 'NULL':
      return null;

    default:
      return value;
  }
}
