import { OutputFormatter, FormatterType } from './types';
import { TableFormatter } from './table-formatter';
import { JsonFormatter } from './json-formatter';

/**
 * Factory function to create formatters
 * @param type - The type of formatter to create
 * @returns An OutputFormatter instance
 */
export function createFormatter(type: FormatterType): OutputFormatter {
  switch (type) {
    case 'table':
      return new TableFormatter();
    case 'json':
      return new JsonFormatter();
    default:
      throw new Error(`Unknown formatter type: ${type}`);
  }
}

// Re-export types and formatters
export { OutputFormatter, FormatterType } from './types';
export { TableFormatter } from './table-formatter';
export { JsonFormatter } from './json-formatter';
