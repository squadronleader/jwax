/**
 * Schema Discovery
 * Automatically discover table schemas from JSON structure
 */

import { TableSchema, SchemaMap } from './types';
import { pathToTableName, sanitizeIdentifier } from './naming';
import { inferColumnTypes, InferOptions } from './type-inference';
import { ColumnDef } from '../engine/types';

export interface DiscoverOptions {
  strictSchema?: boolean;
}

export function discoverSchema(root: any, options: DiscoverOptions = {}): SchemaMap {
  const tables = new Map<string, TableSchema>();
  const rootTables: string[] = [];

  // Handle array at root - skip it
  if (Array.isArray(root)) {
    return { tables, rootTables };
  }

  // If root is a non-empty plain object with any scalar values, create a 'root' table
  // for those scalar fields first, then pass 'root' as parentTable so children get _pid.
  // inferColumnTypes already skips nested objects/arrays, so only scalar columns are included.
  let rootParentTable: string | null = null;
  if (root !== null && typeof root === 'object' && Object.keys(root).length > 0) {
    const hasScalars = Object.values(root).some(v => v === null || typeof v !== 'object');
    if (hasScalars) {
      const columns = inferColumnTypes([root], { strictSchema: options.strictSchema });
      const allColumns: ColumnDef[] = [{ name: '_id', type: 'INTEGER', primaryKey: true }];
      for (const [originalName, column] of columns) {
        allColumns.push({ ...column, originalName });
      }
      const tableSchema: TableSchema = {
        name: 'root',
        path: [],
        originalPath: [],
        columns: allColumns,
        primaryKey: '_id',
      };
      tables.set('root', tableSchema);
      rootTables.push('root');
      rootParentTable = 'root';
    }
  }

  // Walk the JSON structure; children of a root table get linked via _pid
  walkJson(root, [], [], rootParentTable, tables, rootTables, options);

  return { tables, rootTables };
}

function mergeColumnType(existingType: ColumnDef['type'], incomingType: ColumnDef['type']): ColumnDef['type'] {
  if (existingType === incomingType) return existingType;
  if (existingType === 'TEXT' || incomingType === 'TEXT') return 'TEXT';
  if ((existingType === 'REAL' && incomingType === 'INTEGER') || (existingType === 'INTEGER' && incomingType === 'REAL')) {
    return 'REAL';
  }
  if (existingType === 'NULL') return incomingType;
  if (incomingType === 'NULL') return existingType;
  return 'TEXT';
}

function mergeTableSchema(existing: TableSchema, incoming: TableSchema): TableSchema {
  if (existing.columns.length === 0) {
    return incoming;
  }

  const mergedColumns = new Map<string, ColumnDef>();
  for (const col of existing.columns) {
    mergedColumns.set(col.name, { ...col });
  }

  for (const col of incoming.columns) {
    const current = mergedColumns.get(col.name);
    if (!current) {
      mergedColumns.set(col.name, { ...col });
      continue;
    }

    mergedColumns.set(col.name, {
      ...current,
      type: mergeColumnType(current.type, col.type),
      nullable: Boolean(current.nullable || col.nullable),
      primaryKey: Boolean(current.primaryKey || col.primaryKey),
      originalName: current.originalName ?? col.originalName,
    });
  }

  return {
    ...existing,
    path: existing.path.length > 0 ? existing.path : incoming.path,
    originalPath: existing.originalPath.length > 0 ? existing.originalPath : incoming.originalPath,
    parentTable: existing.parentTable ?? incoming.parentTable,
    parentKey: existing.parentKey ?? incoming.parentKey,
    columns: Array.from(mergedColumns.values()),
  };
}

function walkJson(
  value: any,
  path: string[],
  originalPath: string[],
  parentTable: string | null,
  tables: Map<string, TableSchema>,
  rootTables: string[],
  options: DiscoverOptions
): void {
  // Only process objects
  if (value === null || typeof value !== 'object') {
    return;
  }

  // Handle arrays - these become tables
  if (Array.isArray(value)) {
    if (value.length === 0) {
      // Empty array - only create table if not already discovered with columns
      const tableName = pathToTableName(path);
      if (!tables.has(tableName)) {
        const schema: TableSchema = {
          name: tableName,
          path: [...path],
          originalPath: [...originalPath],
          columns: [],
          primaryKey: '_id',
          parentTable: parentTable ?? undefined,
          parentKey: parentTable ? '_pid' : undefined
        };
      const existing = tables.get(tableName);
      if (existing) {
        tables.set(tableName, mergeTableSchema(existing, schema));
      } else {
        tables.set(tableName, schema);
      }

      if (!parentTable && !rootTables.includes(tableName)) {
        rootTables.push(tableName);
      }
      }
      return;
    }

    // Discover columns from array items
    const columns = inferColumnTypes(value, { strictSchema: options.strictSchema });
    
    // Add synthetic primary key
    const allColumns: ColumnDef[] = [
      { name: '_id', type: 'INTEGER', primaryKey: true }
    ];

    // Add parent foreign key if nested
    if (parentTable) {
      allColumns.push({ name: '_pid', type: 'INTEGER' });
    }

    // Add discovered columns with originalName tracking
    for (const [originalName, column] of columns) {
      allColumns.push({ ...column, originalName });
    }

    const tableName = pathToTableName(path);
    const schema: TableSchema = {
      name: tableName,
      path: [...path],
      originalPath: [...originalPath],
      columns: allColumns,
      primaryKey: '_id',
      parentTable: parentTable ?? undefined,
      parentKey: parentTable ? '_pid' : undefined
    };

    const existing = tables.get(tableName);
    if (existing) {
      tables.set(tableName, mergeTableSchema(existing, schema));
    } else {
      tables.set(tableName, schema);
    }

    if (!parentTable && !rootTables.includes(tableName)) {
      rootTables.push(tableName);
    }

    // Walk nested structures within array items
    for (const item of value) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        for (const [key, nestedValue] of Object.entries(item)) {
          // Only process nested objects/arrays
          if (nestedValue !== null && typeof nestedValue === 'object') {
            // For nested objects (not arrays), treat them as single-item arrays
            // For nested arrays, process normally
            if (Array.isArray(nestedValue)) {
              walkJson(nestedValue, [...path, sanitizeIdentifier(key)], [...originalPath, key], tableName, tables, rootTables, options);
            } else {
              // Nested object - treat as single-item array to create related table
              walkJson([nestedValue], [...path, sanitizeIdentifier(key)], [...originalPath, key], tableName, tables, rootTables, options);
            }
          }
        }
      }
    }

    return;
  }

  // Handle plain objects - walk their properties looking for arrays or nested objects
  for (const [key, nestedValue] of Object.entries(value)) {
    if (nestedValue !== null && typeof nestedValue === 'object') {
      // If this is a nested object (not an array), treat it as a single-item array
      // This ensures objects at any level get their own table
      if (!Array.isArray(nestedValue)) {
        walkJson([nestedValue], [...path, sanitizeIdentifier(key)], [...originalPath, key], parentTable, tables, rootTables, options);
      } else {
        // For arrays, process normally
        walkJson(nestedValue, [...path, sanitizeIdentifier(key)], [...originalPath, key], parentTable, tables, rootTables, options);
      }
    }
  }
}
