/**
 * JSON Structure Normalizer
 * Ensures root JSON is always an object (wrapping arrays if needed)
 * and derives appropriate table names for root arrays
 */

export interface NormalizationOptions {
  tableName?: string;
  source?: string;
}

/**
 * Normalizes JSON structure by wrapping root arrays in objects.
 * If JSON is already an object, returns as-is.
 *
 * @param json - The JSON data to normalize (array or object)
 * @param options - Normalization options (tableName override)
 * @returns Normalized JSON with root as object
 */
export function normalizeJsonStructure(json: any, options: NormalizationOptions = {}): any {
  // If not an array, return as-is
  if (!Array.isArray(json)) {
    return json;
  }

  // Determine table name for root array
  const tableName = determineTableName(options.tableName);

  // Wrap array in object
  return { [tableName]: json };
}

/**
 * Determines the table name for a root array.
 * Uses explicit override if provided, otherwise defaults to 'root'.
 */
function determineTableName(override?: string): string {
  if (override) {
    return sanitizeTableName(override);
  }
  return 'root';
}

/**
 * Sanitizes table name for SQL compatibility:
 * - Replace non-alphanumeric characters with underscores
 * - Prefix with 't_' if starts with a number
 * - Use fallback if empty
 */
export function sanitizeTableName(name: string): string {
  if (!name || name === '') {
    return 'data';
  }

  // Replace non-alphanumeric chars with underscores
  let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');

  // Ensure it doesn't start with a number
  if (/^[0-9]/.test(sanitized)) {
    sanitized = 't_' + sanitized;
  }

  // Fallback if empty after sanitization
  if (!sanitized || sanitized === '') {
    return 'data';
  }

  return sanitized;
}
