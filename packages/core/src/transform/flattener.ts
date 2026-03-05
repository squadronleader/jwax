/**
 * JSON Flattener
 * Transform JSON data into SQL rows according to schema
 */

import { SchemaMap, TableSchema } from '../schema/types';
import { IDGenerator } from './id-generator';
import { coerceValue } from './type-coercion';

export interface FlattenResult {
  tableName: string;
  rows: Record<string, any>[];
}

export function flattenJson(
  root: any,
  schema: SchemaMap,
  idGenerator: IDGenerator
): FlattenResult[] {
  const results: FlattenResult[] = [];
  const tableRows = new Map<string, Record<string, any>[]>();

  // Initialize arrays for each table
  for (const tableName of schema.tables.keys()) {
    tableRows.set(tableName, []);
  }

  // Process each root table (children will be processed recursively)
  for (const tableName of schema.rootTables) {
    const table = schema.tables.get(tableName);
    if (table) {
      processTable(root, table, schema, idGenerator, tableRows, null);
    }
  }

  // Convert to result format
  for (const [tableName, rows] of tableRows) {
    results.push({ tableName, rows });
  }

  return results;
}

function processTable(
  root: any,
  table: TableSchema,
  schema: SchemaMap,
  idGenerator: IDGenerator,
  tableRows: Map<string, Record<string, any>[]>,
  parentId: number | null
): void {
  const isRootTable = !table.parentTable;

  // Navigate to the array using ORIGINAL path (before sanitization)
  let current: any = root;
  for (const segment of table.originalPath) {
    if (current === null || typeof current !== 'object') {
      return;
    }
    current = current[segment];
  }

  // If not an array, wrap object in array (to handle single objects)
  if (!Array.isArray(current)) {
    if (current !== null && typeof current === 'object') {
      current = [current];
    } else {
      return;
    }
  }

  // Process each item in the array
  for (const item of current) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }

    // Generate ID for this row
    const rowId = idGenerator.nextId(table.name);

    // Build row
    const row: Record<string, any> = {};

    // Add primary key
    row[table.primaryKey] = rowId;

    // Add parent foreign key if exists
    if (table.parentKey && parentId !== null) {
      row[table.parentKey] = parentId;
    }

    const childPathKeys = new Set(
      Array.from(schema.tables.values())
        .filter(childTable => childTable.parentTable === table.name)
        .map(childTable => childTable.originalPath[table.originalPath.length])
        .filter((key): key is string => Boolean(key))
    );

    // Add data columns
    for (const column of table.columns) {
      // Skip synthetic columns (already handled)
      if (column.name === table.primaryKey || column.name === table.parentKey) {
        continue;
      }

      if (column.name === '_json') {
        if (isRootTable) {
          row._json = JSON.stringify(item);
        }
        continue;
      }

      // Get value from item using original column name
      const originalColumnName = column.originalName || column.name;
      const value = item[originalColumnName];

      if (childPathKeys.has(originalColumnName) && value !== null && typeof value === 'object') {
        row[column.name] = null;
        continue;
      }

      // Coerce to target type
      const coercedValue = coerceValue(value, column.type);

      row[column.name] = coercedValue;
    }

    // Add row to table
    tableRows.get(table.name)!.push(row);

    // Process nested tables (children of this table)
    for (const childTable of schema.tables.values()) {
      if (childTable.parentTable === table.name) {
        // Create a temporary object with the nested data
        const nestedOriginalPath = childTable.originalPath.slice(table.originalPath.length);
        if (nestedOriginalPath.length > 0) {
          const nestedKey = nestedOriginalPath[0];
          const nestedValue = item[nestedKey];

          if (nestedValue !== null && typeof nestedValue === 'object') {
            // Create a synthetic root for this nested structure using ORIGINAL paths
            const syntheticRoot: any = {};
            let current = syntheticRoot;
            
            // Build the path structure using original paths
            for (let i = 0; i < childTable.originalPath.length - 1; i++) {
              const segment = childTable.originalPath[i];
              current[segment] = {};
              current = current[segment];
            }
            
            // Add the nested data
            const lastSegment = childTable.originalPath[childTable.originalPath.length - 1];
            current[lastSegment] = Array.isArray(nestedValue) ? nestedValue : [nestedValue];

            // Process the child table with this row as parent
            processTable(syntheticRoot, childTable, schema, idGenerator, tableRows, rowId);
          }
        }
      }
    }
  }
}
