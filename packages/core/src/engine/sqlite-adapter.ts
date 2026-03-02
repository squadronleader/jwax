import type Database from 'better-sqlite3';
import { SQLEngineAdapter, ColumnDef, QueryResult } from './types';

export class SQLiteAdapter implements SQLEngineAdapter {
  private db: Database.Database;

  constructor() {
    // Lazy-load better-sqlite3 to avoid loading the native addon
    // when this module is imported but not used (e.g., in VS Code extension)
    const BetterSqlite3 = require('better-sqlite3');
    this.db = new BetterSqlite3(':memory:');
  }

  createTable(tableName: string, columns: ColumnDef[]): void {
    const escapedTableName = this.escapeIdentifier(tableName);
    
    // Handle empty columns (empty arrays) - skip table creation
    if (columns.length === 0) {
      return;
    }
    
    const columnDefs = columns.map(col => {
      const parts = [
        this.escapeIdentifier(col.name),
        col.type
      ];
      if (col.primaryKey) {
        parts.push('PRIMARY KEY');
      }
      if (col.nullable === false) {
        parts.push('NOT NULL');
      }
      return parts.join(' ');
    });

    const sql = `CREATE TABLE ${escapedTableName} (${columnDefs.join(', ')})`;
    this.db.exec(sql);
  }

  insert(tableName: string, rows: Record<string, any>[]): void {
    if (rows.length === 0) return;

    const escapedTableName = this.escapeIdentifier(tableName);
    const columns = Object.keys(rows[0]);
    const escapedColumns = columns.map(c => this.escapeIdentifier(c));
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `INSERT INTO ${escapedTableName} (${escapedColumns.join(', ')}) VALUES (${placeholders})`;
    const stmt = this.db.prepare(sql);

    // Use transaction for batch inserts
    const insertMany = this.db.transaction((rows: Record<string, any>[]) => {
      for (const row of rows) {
        const values = columns.map(col => row[col]);
        stmt.run(values);
      }
    });

    insertMany(rows);
  }

  query(sql: string): QueryResult {
    try {
      const stmt = this.db.prepare(sql);
      const rows = stmt.all() as Record<string, any>[];

      if (rows.length === 0) {
        return { headers: [], rows: [] };
      }

      // Extract headers from first row
      const headers = Object.keys(rows[0]);
      
      // Convert rows to 2D array
      const rowArrays = rows.map(row => 
        headers.map(header => row[header])
      );

      return { headers, rows: rowArrays };
    } catch (error) {
      throw new Error(`SQL Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  close(): void {
    this.db.close();
  }

  reset(): void {
    // Get all table names
    const tables = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all() as { name: string }[];

    // Drop each table
    for (const table of tables) {
      this.db.exec(`DROP TABLE IF EXISTS ${this.escapeIdentifier(table.name)}`);
    }
  }

  private escapeIdentifier(identifier: string): string {
    // Use double quotes for SQL identifiers (standard SQL)
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}
