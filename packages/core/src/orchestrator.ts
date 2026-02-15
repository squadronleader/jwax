/**
 * Query Orchestrator
 * Coordinates schema discovery, data transformation, and SQL execution
 */

import { createEngine, SQLEngineAdapter, QueryResult } from './engine';
import { discoverSchema, SchemaMap, DiscoverOptions } from './schema';
import { flattenJson, IDGenerator } from './transform';
import { deNormalizeWithNesting } from './denormalizer';

export interface OrchestratorOptions {
  strictSchema?: boolean;
}

export class QueryOrchestrator {
  private engine: SQLEngineAdapter;
  private schema: SchemaMap | null = null;
  private loaded: boolean = false;
  private options: OrchestratorOptions;

  constructor(engineOrType: SQLEngineAdapter | 'sqlite' = 'sqlite', options: OrchestratorOptions = {}) {
    if (typeof engineOrType === 'string') {
      this.engine = createEngine(engineOrType);
    } else {
      this.engine = engineOrType;
    }
    this.options = options;
  }

  /**
   * Load JSON data and prepare for querying
   */
  loadJson(root: any): void {
    // Reset state
    this.engine.reset();
    this.schema = null;
    this.loaded = false;

    // Step 1: Discover schema
    this.schema = discoverSchema(root, { strictSchema: this.options.strictSchema });

    if (this.schema.tables.size === 0) {
      // No tables to create
      this.loaded = true;
      return;
    }

    // Step 2: Create tables in SQL engine
    for (const table of this.schema.tables.values()) {
      this.engine.createTable(table.name, table.columns);
    }

    // Step 3: Transform JSON into rows
    const idGenerator = new IDGenerator();
    const flattenedData = flattenJson(root, this.schema, idGenerator);

    // Step 4: Insert rows (in dependency order - parents before children)
    const insertedTables = new Set<string>();
    const maxIterations = this.schema.tables.size * 2; // Prevent infinite loops
    let iterations = 0;

    while (insertedTables.size < this.schema.tables.size && iterations < maxIterations) {
      iterations++;

      for (const result of flattenedData) {
        if (insertedTables.has(result.tableName)) {
          continue;
        }

        const table = this.schema.tables.get(result.tableName);
        if (!table) continue;

        // Check if parent has been inserted (if applicable)
        if (table.parentTable && !insertedTables.has(table.parentTable)) {
          continue; // Skip for now, will process in next iteration
        }

        // Insert rows
        if (result.rows.length > 0) {
          this.engine.insert(result.tableName, result.rows);
        }

        insertedTables.add(result.tableName);
      }
    }

    this.loaded = true;
  }

  /**
   * Execute a SQL query
   */
  executeQuery(sql: string): QueryResult {
    if (!this.loaded) {
      throw new Error('No JSON data loaded. Call loadJson() first.');
    }

    return this.engine.query(sql);
  }

  /**
   * Execute a query and return de-normalized results (for single-table queries)
   * Maps sanitized column names back to original JSON keys and excludes synthetic columns
   */
  executeQueryWithDenormalization(sql: string, tableName?: string): any[] {
    if (!this.loaded || !this.schema) {
      throw new Error('No JSON data loaded. Call loadJson() first.');
    }

    const result = this.engine.query(sql);
    
    // Try to determine table name from query if not provided
    if (!tableName) {
      // Match FROM clause more robustly, handling aliases
      const fromMatch = sql.match(/FROM\s+([a-z_]\w*)/i);
      if (fromMatch) {
        tableName = fromMatch[1].toLowerCase();
      }
    }

    if (!tableName || !this.schema.tables.has(tableName)) {
      // Can't de-normalize without knowing the table, return as objects with synthetic columns excluded
      return result.rows.map((row, idx) => {
        const obj: Record<string, any> = {};
        result.headers.forEach((header, colIdx) => {
          if (header !== '_id' && header !== '_pid') {
            obj[header] = row[colIdx];
          }
        });
        return obj;
      });
    }

    const table = this.schema.tables.get(tableName)!;
    
    // Get child tables for nested reconstruction
    const childTables = Array.from(this.schema.tables.values())
      .filter(t => t.parentTable === tableName);

    // If no child tables, just rename columns and exclude synthetic ones
    if (childTables.length === 0) {
      return result.rows.map(row => {
        const obj: Record<string, any> = {};
        result.headers.forEach((header, colIdx) => {
          if (header !== '_id' && header !== '_pid') {
            const col = table.columns.find(c => c.name === header);
            const originalName = col?.originalName || header;
            obj[originalName] = row[colIdx];
          }
        });
        return obj;
      });
    }

    // Query child tables for each parent row
    // First, we need to query with _id to be able to fetch child data
    const parentIdIndex = result.headers.indexOf('_id');
    const childDataMap = new Map<string, any[]>();
    
    if (parentIdIndex >= 0) {
      // _id was selected, we can fetch child data
      for (const parentRow of result.rows) {
        const parentId = parentRow[parentIdIndex];
        
        for (const childTable of childTables) {
          const childResult = this.engine.query(
            `SELECT * FROM ${childTable.name} WHERE _pid = ${parentId}`
          );
          
          // De-normalize child rows
          const nestedKey = getNestedKeyFromPath(childTable.originalPath, table.originalPath);
          if (nestedKey) {
            const childRows = childResult.rows.map((row, idx) => {
              const obj: Record<string, any> = {};
              childResult.headers.forEach((header, colIdx) => {
                if (header !== '_id' && header !== '_pid') {
                  const col = childTable.columns.find(c => c.name === header);
                  const originalName = col?.originalName || header;
                  obj[originalName] = row[colIdx];
                }
              });
              return obj;
            });
            
            const childKey = `${childTable.name}:${parentId}`;
            childDataMap.set(childKey, childRows);
          }
        }
      }
    }

    // Convert result to objects with de-normalization
    return result.rows.map((row, idx) => {
      const obj: Record<string, any> = {};
      const parentId = parentIdIndex >= 0 ? row[parentIdIndex] : null;
      
      // Map columns to original names
      result.headers.forEach((header, colIdx) => {
        if (header !== '_id' && header !== '_pid') {
          const col = table.columns.find(c => c.name === header);
          const originalName = col?.originalName || header;
          obj[originalName] = row[colIdx];
        }
      });

      // Add nested objects only if we have _id
      if (parentId !== null) {
        for (const childTable of childTables) {
          const nestedKey = getNestedKeyFromPath(childTable.originalPath, table.originalPath);
          if (nestedKey) {
            const childKey = `${childTable.name}:${parentId}`;
            obj[nestedKey] = childDataMap.get(childKey) || [];
          }
        }
      }

      return obj;
    });
  }

  /**
   * Get the discovered schema
   */
  getSchema(): SchemaMap | null {
    return this.schema;
  }

  /**
   * List all available tables
   */
  listTables(): string[] {
    if (!this.schema) {
      return [];
    }
    return Array.from(this.schema.tables.keys());
  }

  /**
   * Get schema for a specific table
   */
  getTableSchema(tableName: string) {
    if (!this.schema) {
      return null;
    }
    return this.schema.tables.get(tableName) || null;
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.engine.close();
  }

  /**
   * Reset the orchestrator state
   */
  reset(): void {
    this.engine.reset();
    this.schema = null;
    this.loaded = false;
  }
}

/**
 * Extract the nested key name by finding the difference between child and parent paths
 * e.g., parent=["users"], child=["users", "address"] -> "address"
 */
function getNestedKeyFromPath(childPath: string[], parentPath: string[]): string | null {
  if (childPath.length <= parentPath.length) {
    return null;
  }

  const diff = childPath.slice(parentPath.length);
  if (diff.length === 1) {
    return diff[0];
  }

  return null;
}
