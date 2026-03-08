/**
 * Path Naming
 * Convert JSON paths to valid SQL table names
 */

export function pathToTableName(path: string[]): string {
  if (path.length === 0) {
    throw new Error('Path cannot be empty');
  }

  const sanitizedPath = path.map(segment => sanitizeIdentifier(segment));
  if (sanitizedPath.length === 1) {
    return sanitizedPath[0];
  }

  const parentInitials = sanitizedPath
    .slice(0, -1)
    .map(segment => segment[0] ?? '')
    .join('');

  return `${parentInitials}_${sanitizedPath[sanitizedPath.length - 1]}`;
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
