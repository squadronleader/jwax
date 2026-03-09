/**
 * Schema Discovery
 * Automatically discover table schemas from JSON structure
 */

import { TableSchema, SchemaMap } from './types';
import { sanitizeIdentifier } from './naming';
import { inferColumnTypes, InferOptions } from './type-inference';
import { ColumnDef } from '../engine/types';

export interface DiscoverOptions {
  strictSchema?: boolean;
  includeJsonColumn?: boolean;
}

export function discoverSchema(root: any, options: DiscoverOptions = {}): SchemaMap {
  const tables = new Map<string, TableSchema>();
  const rootTables: string[] = [];
  const tableNameByPath = new Map<string, string>();
  const tablePathByName = new Map<string, string>();
  const pathSegmentsByKey = new Map<string, string[]>();
  const reservedTableNames = new Set<string>();

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
      if (options.includeJsonColumn) {
        allColumns.push({ name: '_json', type: 'TEXT' });
      }
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
      tablePathByName.set('root', '__root_scalar_table__');
      reservedTableNames.add('root');
      rootParentTable = 'root';
    }
  }

  // Walk the JSON structure; children of a root table get linked via _pid
  walkJson(
    root,
    [],
    [],
    rootParentTable,
    tables,
    rootTables,
    options,
    tableNameByPath,
    tablePathByName,
    pathSegmentsByKey,
    reservedTableNames
  );

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
  options: DiscoverOptions,
  tableNameByPath: Map<string, string>,
  tablePathByName: Map<string, string>,
  pathSegmentsByKey: Map<string, string[]>,
  reservedTableNames: Set<string>
): void {
  // Only process objects
  if (value === null || typeof value !== 'object') {
    return;
  }

  // Handle arrays - these become tables
  if (Array.isArray(value)) {
    if (value.length === 0) {
      // Empty array - only create table if not already discovered with columns
      const tableName = resolveUniqueTableName(
        path,
        tables,
        rootTables,
        tableNameByPath,
        tablePathByName,
        pathSegmentsByKey,
        reservedTableNames
      );
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
    } else if (options.includeJsonColumn) {
      allColumns.push({ name: '_json', type: 'TEXT' });
    }

    // Add discovered columns with originalName tracking
    for (const [originalName, column] of columns) {
      allColumns.push({ ...column, originalName });
    }

    const tableName = resolveUniqueTableName(
      path,
      tables,
      rootTables,
      tableNameByPath,
      tablePathByName,
      pathSegmentsByKey,
      reservedTableNames
    );
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
              walkJson(
                nestedValue,
                [...path, sanitizeIdentifier(key)],
                [...originalPath, key],
                tableName,
                tables,
                rootTables,
                options,
                tableNameByPath,
                tablePathByName,
                pathSegmentsByKey,
                reservedTableNames
              );
            } else {
              // Nested object - treat as single-item array to create related table
              walkJson(
                [nestedValue],
                [...path, sanitizeIdentifier(key)],
                [...originalPath, key],
                tableName,
                tables,
                rootTables,
                options,
                tableNameByPath,
                tablePathByName,
                pathSegmentsByKey,
                reservedTableNames
              );
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
        walkJson(
          [nestedValue],
          [...path, sanitizeIdentifier(key)],
          [...originalPath, key],
          parentTable,
          tables,
          rootTables,
          options,
          tableNameByPath,
          tablePathByName,
          pathSegmentsByKey,
          reservedTableNames
        );
      } else {
        // For arrays, process normally
        walkJson(
          nestedValue,
          [...path, sanitizeIdentifier(key)],
          [...originalPath, key],
          parentTable,
          tables,
          rootTables,
          options,
          tableNameByPath,
          tablePathByName,
          pathSegmentsByKey,
          reservedTableNames
        );
      }
    }
  }
}

function resolveUniqueTableName(
  path: string[],
  tables: Map<string, TableSchema>,
  rootTables: string[],
  tableNameByPath: Map<string, string>,
  tablePathByName: Map<string, string>,
  pathSegmentsByKey: Map<string, string[]>,
  reservedTableNames: Set<string>
): string {
  if (path.length === 0) {
    throw new Error('Path cannot be empty');
  }

  const sanitizedPath = path.map(segment => sanitizeIdentifier(segment));
  const pathKey = sanitizedPath.join('\u0000');
  if (!pathSegmentsByKey.has(pathKey)) {
    pathSegmentsByKey.set(pathKey, sanitizedPath);
  }

  recomputeUniqueTableNames(
    tables,
    rootTables,
    tableNameByPath,
    tablePathByName,
    pathSegmentsByKey,
    reservedTableNames
  );

  const resolved = tableNameByPath.get(pathKey);
  if (!resolved) {
    throw new Error(`Unable to derive unique table name for path: ${sanitizedPath.join('.')}`);
  }
  return resolved;
}

function recomputeUniqueTableNames(
  tables: Map<string, TableSchema>,
  rootTables: string[],
  tableNameByPath: Map<string, string>,
  tablePathByName: Map<string, string>,
  pathSegmentsByKey: Map<string, string[]>,
  reservedTableNames: Set<string>
): void {
  const startIndexes = new Map<string, number>();
  for (const [pathKey, segments] of pathSegmentsByKey.entries()) {
    const start = segments.length === 1 ? 0 : segments.length - 2;
    startIndexes.set(pathKey, start);
  }

  while (true) {
    const candidateToPathKeys = new Map<string, string[]>();
    for (const [pathKey, segments] of pathSegmentsByKey.entries()) {
      const start = startIndexes.get(pathKey)!;
      const candidate = segments.slice(start).join('_');
      const list = candidateToPathKeys.get(candidate) ?? [];
      list.push(pathKey);
      candidateToPathKeys.set(candidate, list);
    }

    const collidingPathKeys = new Set<string>();
    for (const [candidate, pathKeys] of candidateToPathKeys.entries()) {
      if (pathKeys.length > 1 || reservedTableNames.has(candidate)) {
        for (const pathKey of pathKeys) {
          collidingPathKeys.add(pathKey);
        }
      }
    }

    if (collidingPathKeys.size === 0) {
      break;
    }

    let progressed = false;
    for (const pathKey of collidingPathKeys) {
      const start = startIndexes.get(pathKey)!;
      if (start > 0) {
        startIndexes.set(pathKey, start - 1);
        progressed = true;
      }
    }

    if (!progressed) {
      throw new Error('Unable to derive globally unique table names from JSON paths');
    }
  }

  const newNameByPath = new Map<string, string>();
  for (const [pathKey, segments] of pathSegmentsByKey.entries()) {
    const start = startIndexes.get(pathKey)!;
    newNameByPath.set(pathKey, segments.slice(start).join('_'));
  }

  for (const [pathKey, newName] of newNameByPath.entries()) {
    const oldName = tableNameByPath.get(pathKey);
    if (oldName && oldName !== newName) {
      renameTable(tables, rootTables, oldName, newName);
      tablePathByName.delete(oldName);
    }
    tableNameByPath.set(pathKey, newName);
    tablePathByName.set(newName, pathKey);
  }
}

function renameTable(
  tables: Map<string, TableSchema>,
  rootTables: string[],
  oldName: string,
  newName: string
): void {
  if (oldName === newName) {
    return;
  }

  const schema = tables.get(oldName);
  if (schema) {
    tables.delete(oldName);
    schema.name = newName;
    tables.set(newName, schema);
  }

  for (let i = 0; i < rootTables.length; i++) {
    if (rootTables[i] === oldName) {
      rootTables[i] = newName;
    }
  }

  for (const table of tables.values()) {
    if (table.parentTable === oldName) {
      table.parentTable = newName;
    }
  }
}
