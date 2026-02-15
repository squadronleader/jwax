/**
 * Pure utility functions for JSON validation
 * No external dependencies on frameworks like vscode
 */

/**
 * Quickly checks if text looks like JSON by inspecting the first non-whitespace character.
 * This is a fast heuristic check without parsing the entire text.
 * 
 * Useful for:
 * - Avoiding expensive JSON.parse() calls on non-JSON files
 * - Pre-filtering files before deeper validation
 * - CLI and extension tools that need quick validation
 * 
 * @param text The text to check
 * @returns true if text starts with { or [, false otherwise
 */
export function isJsonText(text: string): boolean {
  try {
    const firstNonWhitespaceChar = text.trimStart().charAt(0);
    return firstNonWhitespaceChar === '{' || firstNonWhitespaceChar === '[';
  } catch {
    return false;
  }
}
