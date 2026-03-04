import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { SQLEngineAdapter, ColumnDef, QueryResult } from '@jwax/core';

export class SqlJsAdapter implements SQLEngineAdapter {
  private db: SqlJsDatabase;

  private constructor(db: SqlJsDatabase) {
    this.db = db;
  }

  static async create(): Promise<SqlJsAdapter> {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    return new SqlJsAdapter(db);
  }

  createTable(tableName: string, columns: ColumnDef[]): void {
    if (columns.length === 0) return;
    const defs = columns.map(col => {
      const parts = [this.escapeIdentifier(col.name), col.type];
      if (col.primaryKey) parts.push('PRIMARY KEY');
      if (col.nullable === false) parts.push('NOT NULL');
      return parts.join(' ');
    });
    this.db.run(`CREATE TABLE ${this.escapeIdentifier(tableName)} (${defs.join(', ')})`);
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
        stmt.run(columns.map(col => row[col] as any));
      }
      this.db.run('COMMIT');
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    } finally {
      stmt.free();
    }
  }

  query(sql: string): QueryResult {
    try {
      const results = this.db.exec(sql);
      if (results.length === 0) return { headers: [], rows: [] };
      return { headers: results[0].columns, rows: results[0].values };
    } catch (error) {
      throw new Error(`SQL Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  close(): void {
    this.db.close();
  }

  reset(): void {
    const tables = this.db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    if (tables.length === 0) return;
    for (const row of tables[0].values) {
      this.db.run(`DROP TABLE IF EXISTS ${this.escapeIdentifier(String(row[0]))}`);
    }
  }

  private escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}
