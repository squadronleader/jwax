/**
 * SQL Error parsing utilities
 */

export interface SQLErrorInfo {
  isTableNotFound: boolean;
  message: string;
  tableName?: string;
}

/**
 * Parses SQL errors to detect specific error types.
 * Currently detects "no such table" errors.
 */
export function parseSQLError(error: any): SQLErrorInfo {
  const message = error.message || String(error);
  
  // Check for "no such table" pattern
  const tableNotFoundMatch = message.match(/no such table:\s*(\w+)/i);
  if (tableNotFoundMatch) {
    return {
      isTableNotFound: true,
      message,
      tableName: tableNotFoundMatch[1],
    };
  }

  return {
    isTableNotFound: false,
    message,
  };
}
