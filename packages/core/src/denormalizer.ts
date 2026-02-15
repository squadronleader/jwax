/**
 * De-normalizer
 * Reconstructs nested JSON from flattened SQL query results
 * Maps sanitized column names back to original JSON keys
 */

import { QueryResult } from './engine/types';
import { SchemaMap, TableSchema } from './schema/types';

export interface DeNormalizeOptions {
  excludeSyntheticColumns?: boolean;  // Exclude _id, _pid
}

/**
 * De-normalize query results back to original JSON structure
 * Reconstructs nested objects and maps column names to original keys
 */
export function deNormalizeQueryResult(
  result: QueryResult,
  schema: SchemaMap,
  tableName: string,
  options: DeNormalizeOptions = {}
): any[] {
  const excludeSynthetic = options.excludeSyntheticColumns ?? true;
  const table = schema.tables.get(tableName);
  
  if (!table) {
    // Table not in schema, return as-is (shouldn't happen)
    return rowsToObjects(result.headers, result.rows, excludeSynthetic);
  }

  // Get all child tables (tables that have this table as parent)
  const childTables = Array.from(schema.tables.values())
    .filter(t => t.parentTable === tableName);

  const rows = rowsToObjects(result.headers, result.rows, excludeSynthetic);
  
  if (childTables.length === 0) {
    // No nested tables, just rename columns and return
    return rows.map(row => renameColumnsToOriginal(row, table, excludeSynthetic));
  }

  // For each row, reconstruct nested objects
  return rows.map(row => reconstructNestedObjects(row, table, childTables, schema, excludeSynthetic));
}

/**
 * Convert rows (arrays) to objects (maps column names to values)
 */
function rowsToObjects(headers: string[], rows: any[][], excludeSynthetic: boolean): Record<string, any>[] {
  return rows.map(row => {
    const obj: Record<string, any> = {};
    headers.forEach((header, index) => {
      if (excludeSynthetic && (header === '_id' || header === '_pid')) {
        return;  // Skip synthetic columns
      }
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * Rename sanitized column names back to original JSON keys
 */
function renameColumnsToOriginal(
  row: Record<string, any>,
  table: TableSchema,
  excludeSynthetic: boolean
): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const column of table.columns) {
    if (excludeSynthetic && (column.name === '_id' || column.name === '_pid')) {
      continue;
    }
    
    const value = row[column.name];
    const originalName = column.originalName || column.name;
    
    // Only include if value exists in row
    if (column.name in row) {
      result[originalName] = value;
    }
  }
  
  return result;
}

/**
 * Reconstruct nested objects from parent and child tables
 * For a parent row with ID X, find all child rows with _pid = X and nest them
 */
function reconstructNestedObjects(
  parentRow: Record<string, any>,
  parentTable: TableSchema,
  childTables: TableSchema[],
  schema: SchemaMap,
  excludeSynthetic: boolean
): Record<string, any> {
  const result = renameColumnsToOriginal(parentRow, parentTable, excludeSynthetic);
  const parentId = parentRow._id;

  // For each child table, find all rows with _pid = parentId and nest them
  for (const childTable of childTables) {
    const childTableName = childTable.name;
    
    // Determine the nested key name from the child table's original path
    const nestedKey = getNestedKeyFromPath(childTable.originalPath, parentTable.originalPath);
    
    if (!nestedKey) {
      continue;
    }

    // In a real implementation, we would query child table rows here
    // For now, this marks where nested data should be attached
    // This requires access to the orchestrator to query child tables
    // We'll handle this in the orchestrator layer instead
    result[nestedKey] = [];
  }

  return result;
}

/**
 * Extract the nested key name by finding the difference between child and parent paths
 * e.g., parent=["users"], child=["users", "address"] -> "address"
 */
function getNestedKeyFromPath(childPath: string[], parentPath: string[]): string | null {
  if (childPath.length <= parentPath.length) {
    return null;
  }

  // Get the last segment of child path that's not in parent path
  const diff = childPath.slice(parentPath.length);
  if (diff.length === 1) {
    return diff[0];
  }

  return null;
}

/**
 * Full de-normalization with nested object reconstruction
 * This requires access to the orchestrator to query child tables
 */
export function deNormalizeWithNesting(
  result: QueryResult,
  schema: SchemaMap,
  tableName: string,
  childDataMap: Map<string, any[]>,  // Precomputed child data
  options: DeNormalizeOptions = {}
): any[] {
  const excludeSynthetic = options.excludeSyntheticColumns ?? true;
  const table = schema.tables.get(tableName);
  
  if (!table) {
    return rowsToObjects(result.headers, result.rows, excludeSynthetic);
  }

  const rows = rowsToObjects(result.headers, result.rows, excludeSynthetic);
  const childTables = Array.from(schema.tables.values())
    .filter(t => t.parentTable === tableName);

  if (childTables.length === 0) {
    return rows.map(row => renameColumnsToOriginal(row, table, excludeSynthetic));
  }

  return rows.map(parentRow => {
    const result = renameColumnsToOriginal(parentRow, table, excludeSynthetic);
    const parentId = parentRow._id;

    // For each child table, nest the corresponding rows
    for (const childTable of childTables) {
      const nestedKey = getNestedKeyFromPath(childTable.originalPath, table.originalPath);
      if (!nestedKey) continue;

      const childKey = `${childTable.name}:${parentId}`;
      const childRows = childDataMap.get(childKey) || [];
      
      result[nestedKey] = childRows;
    }

    return result;
  });
}
