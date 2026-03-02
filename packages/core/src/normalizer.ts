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
 * @param options - Normalization options (tableName or source for derivation)
 * @returns Normalized JSON with root as object
 */
export function normalizeJsonStructure(json: any, options: NormalizationOptions = {}): any {
  // If not an array, return as-is
  if (!Array.isArray(json)) {
    return json;
  }

  // Determine table name for root array
  const tableName = determineTableName(options.tableName, options.source);

  // Wrap array in object
  return { [tableName]: json };
}

/**
 * Determines the table name for a root array, following priority order:
 * 1. Explicit override (tableName option)
 * 2. Source: stdin → 'data'
 * 3. Source: URL → extract from path
 * 4. Source: file path → extract filename
 * 5. Fallback → 'data'
 */
function determineTableName(override?: string, source?: string): string {
  // Priority 1: Use explicit override if provided
  if (override) {
    return sanitizeTableName(override);
  }

  // Determine base name from source
  let baseName: string;

  if (!source) {
    baseName = 'data';
  } else if (source === 'stdin') {
    // Priority 2: For stdin, default to 'data'
    baseName = 'data';
  } else if (isUrl(source)) {
    // Priority 3: For URLs, try to extract a meaningful name from the path
    baseName = deriveTableNameFromUrl(source);
  } else {
    // Priority 4: For files, try to use the filename without extension
    baseName = deriveTableNameFromFilePath(source);
  }

  return sanitizeTableName(baseName);
}

/**
 * Checks if a string is a URL (http:// or https://)
 */
function isUrl(input: string): boolean {
  return input.startsWith('http://') || input.startsWith('https://');
}

/**
 * Extracts table name from URL path (last segment, without extension)
 */
function deriveTableNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
    if (pathParts.length > 0) {
      // Use the last path segment as the table name
      return removeExtension(pathParts[pathParts.length - 1]);
    }
  } catch {
    // If URL parsing fails, just use 'data'
  }
  return 'data';
}

/**
 * Extracts table name from file path (filename without extension)
 */
function deriveTableNameFromFilePath(filePath: string): string {
  const parts = filePath.split('/');
  const filename = parts[parts.length - 1];
  return removeExtension(filename);
}

/**
 * Removes file extension from a filename
 * Handles single and double extensions (e.g., .tar.gz)
 */
function removeExtension(filename: string): string {
  // Remove everything from first dot onwards
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  return withoutExt || 'data';
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
