import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { SQLEngineAdapter, ColumnDef, QueryResult } from '@jwax/core';

export class SqlJsAdapter implements SQLEngineAdapter {
  private db: SqlJsDatabase;

  constructor(db: SqlJsDatabase) {
    this.db = db;
  }

  /**
   * Create a SqlJsAdapter. Must be called async to initialize WASM.
   */
  static async create(): Promise<SqlJsAdapter> {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    return new SqlJsAdapter(db);
  }

  createTable(tableName: string, columns: ColumnDef[]): void {
    if (columns.length === 0) {
      return;
    }

    const columnDefs = columns.map(col => {
      const parts = [this.escapeIdentifier(col.name), col.type];
      if (col.primaryKey) {
        parts.push('PRIMARY KEY');
      }
      if (col.nullable === false) {
        parts.push('NOT NULL');
      }
      return parts.join(' ');
    });

    const sql = `CREATE TABLE ${this.escapeIdentifier(tableName)} (${columnDefs.join(', ')})`;
    this.db.run(sql);
  }

  insert(tableName: string, rows: Record<string, unknown>[]): void {
    if (rows.length === 0) return;

    const columns = Object.keys(rows[0]);
    const escapedColumns = columns.map(c => this.escapeIdentifier(c));
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.escapeIdentifier(tableName)} (${escapedColumns.join(', ')}) VALUES (${placeholders})`;

    const stmt = this.db.prepare(sql);
    try {
      this.db.run('BEGIN TRANSACTION');
      for (const row of rows) {
        const values = columns.map(col => row[col] as any);
        stmt.run(values);
      }
      this.db.run('COMMIT');
    } catch (err) {
      this.db.run('ROLLBACK');
      throw err;
    } finally {
      stmt.free();
    }
  }

  query(sql: string): QueryResult {
    try {
      const results = this.db.exec(sql);

      if (results.length === 0) {
        return { headers: [], rows: [] };
      }

      const result = results[0];
      return {
        headers: result.columns,
        rows: result.values,
      };
    } catch (error) {
      throw new Error(`SQL Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  close(): void {
    this.db.close();
  }

  reset(): void {
    const results = this.db.exec(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );

    if (results.length > 0) {
      for (const row of results[0].values) {
        this.db.run(`DROP TABLE IF EXISTS ${this.escapeIdentifier(String(row[0]))}`);
      }
    }
  }

  private escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}
