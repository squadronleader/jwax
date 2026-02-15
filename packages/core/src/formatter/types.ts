import { QueryResult } from '../engine/types';

/**
 * Output formatter interface
 * Formatters are pure functions that convert QueryResult to string output
 */
export interface OutputFormatter {
  /**
   * Format a query result into a string representation
   * @param result - The query result to format
   * @returns Formatted string output
   */
  format(result: QueryResult): string;
}

export type FormatterType = 'table' | 'json';
