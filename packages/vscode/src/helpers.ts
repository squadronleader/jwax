import { QueryOrchestrator, SchemaMap, QueryResult, isJsonText, normalizeJsonStructure } from '@jwax/core';
import { SqlJsAdapter } from './sqljs-adapter';

export { isJsonText };

/**
 * Validates that the given text is valid JSON and returns the parsed object.
 * Throws an error with a user-friendly message if parsing fails.
 */
export function parseJsonText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('The active file does not contain valid JSON.');
  }
}

/**
 * Creates an orchestrator with sql.js engine, loads JSON data, and returns it.
 * Applies normalization to handle root arrays.
 * Caller is responsible for calling close() when done.
 */
export async function createLoadedOrchestrator(jsonData: unknown): Promise<QueryOrchestrator> {
  const engine = await SqlJsAdapter.create();
  const orchestrator = new QueryOrchestrator(engine);
  
  // Normalize JSON (wraps root arrays in objects)
  const normalizedJson = normalizeJsonStructure(jsonData, { source: 'data' });
  
  orchestrator.loadJson(normalizedJson);
  return orchestrator;
}

/**
 * Formats query results as an ASCII table string for the output channel.
 * Accepts a QueryResult (headers + rows) matching the CLI's executeQuery() output.
 */
export function formatResultsAsTable(result: QueryResult): string {
  if (result.rows.length === 0) {
    return 'Query returned no results.';
  }

  const columns = result.headers;
  const widths = columns.map((col, i) =>
    Math.max(col.length, ...result.rows.map(row => String(row[i] ?? '').length))
  );

  const separator = '+-' + widths.map(w => '-'.repeat(w)).join('-+-') + '-+';
  const header = '| ' + columns.map((col, i) => col.padEnd(widths[i])).join(' | ') + ' |';
  const rows = result.rows.map(row =>
    '| ' + columns.map((col, i) => String(row[i] ?? '').padEnd(widths[i])).join(' | ') + ' |'
  );

  return [separator, header, separator, ...rows, separator].join('\n');
}

/**
 * Formats table list for output channel display.
 */
export function formatTableList(tables: string[]): string {
  if (tables.length === 0) {
    return 'No tables found in the JSON data.';
  }
  const lines = [`Found ${tables.length} table(s):`, ''];
  tables.forEach(t => lines.push(`  • ${t}`));
  return lines.join('\n');
}

/**
 * Formats schema information for output channel display.
 */
export function formatSchema(schema: SchemaMap | null): string {
  if (!schema || schema.tables.size === 0) {
    return 'No schema found.';
  }

  const lines: string[] = [];
  for (const [tableName, tableSchema] of schema.tables) {
    lines.push(`Table: ${tableName}`);
    lines.push('-'.repeat(40));
    for (const col of tableSchema.columns) {
      lines.push(`  ${col.name.padEnd(20)} ${col.type}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
