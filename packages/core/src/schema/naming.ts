/**
 * Path Naming
 * Convert JSON paths to valid SQL table names
 */

export function pathToTableName(path: string[]): string {
  if (path.length === 0) {
    throw new Error('Path cannot be empty');
  }

  // Join with underscore and sanitize
  return path
    .map(segment => sanitizeIdentifier(segment))
    .join('_');
}

export function sanitizeIdentifier(str: string): string {
  // Replace non-alphanumeric characters with underscore
  let result = str.replace(/[^a-zA-Z0-9_]/g, '_');
  
  // Ensure it starts with a letter or underscore (SQL requirement)
  if (/^[0-9]/.test(result)) {
    result = '_' + result;
  }
  
  // Remove consecutive underscores
  result = result.replace(/_+/g, '_');
  
  // Remove trailing underscores
  result = result.replace(/_$/, '');
  
  // Handle empty result
  if (!result) {
    result = 'table_data';
  }
  
  return result.toLowerCase();
}
