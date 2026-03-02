/**
 * SQL Engine Adapter Interface
 * Abstracts the underlying SQL engine (SQLite, DuckDB, etc.)
 */

export interface ColumnDef {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'NULL';
  primaryKey?: boolean;
  nullable?: boolean;
  originalName?: string;  // Track original JSON key name for de-normalization
}

export interface QueryResult {
  headers: string[];
  rows: any[][];
}

export interface SQLEngineAdapter {
  /**
   * Create a table with the specified columns
   */
  createTable(tableName: string, columns: ColumnDef[]): void;

  /**
   * Insert rows into a table
   */
  insert(tableName: string, rows: Record<string, any>[]): void;

  /**
   * Execute a SQL query and return results
   */
  query(sql: string): QueryResult;

  /**
   * Close the database connection
   */
  close(): void;

  /**
   * Reset the database (drop all tables)
   */
  reset(): void;
}
