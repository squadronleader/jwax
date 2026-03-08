/**
 * Schema Types
 * Define how JSON structures map to SQL tables
 */

import { ColumnDef } from '../engine/types';

export interface TableSchema {
  name: string;              // Table name (e.g., "users", "u_address")
  path: string[];            // JSON path (e.g., ["users"], ["users", "address"])
  originalPath: string[];    // Original JSON path before sanitization (e.g., ["users"], ["users", "user-address"])
  columns: ColumnDef[];      // Column definitions
  parentTable?: string;      // Parent table name for nested objects
  parentKey?: string;        // FK column name (e.g., "_pid")
  primaryKey: string;        // PK column name (e.g., "_id")
}

export interface SchemaMap {
  tables: Map<string, TableSchema>;
  rootTables: string[];      // Top-level tables (no parent)
}
