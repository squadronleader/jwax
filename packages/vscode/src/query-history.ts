/**
 * QueryHistoryManager
 *
 * Manages per-file query history with a configurable size limit.
 * Queries are stored most-recent-first and deduplicated.
 */
export class QueryHistoryManager {
  private history: Map<string, string[]> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 5) {
    this.maxSize = Math.max(0, maxSize);
  }

  /**
   * Set the maximum history size. Existing histories are trimmed if necessary.
   */
  setMaxSize(maxSize: number): void {
    this.maxSize = Math.max(0, maxSize);
    // Trim all existing histories to the new max size
    for (const fileUri of this.history.keys()) {
      const queries = this.history.get(fileUri);
      if (queries && queries.length > this.maxSize) {
        this.history.set(fileUri, queries.slice(0, this.maxSize));
      }
    }
  }

  /**
   * Check if history is enabled (maxSize > 0).
   */
  isEnabled(): boolean {
    return this.maxSize > 0;
  }

  /**
   * Add a query to the history for a file.
   * - Removes duplicates (moves existing query to front if re-entered)
   * - Adds to front (most recent first)
   * - Trims to maxSize
   * - No-op if disabled (maxSize === 0)
   */
  addQuery(fileUri: string, query: string): void {
    if (!this.isEnabled() || !query.trim()) {
      return;
    }

    const trimmedQuery = query.trim();
    let queries = this.history.get(fileUri) || [];

    // Remove the query if it already exists
    queries = queries.filter(q => q !== trimmedQuery);

    // Add to front
    queries.unshift(trimmedQuery);

    // Trim to max size
    queries = queries.slice(0, this.maxSize);

    this.history.set(fileUri, queries);
  }

  /**
   * Get the query history for a file (most recent first).
   * Returns empty array if history is disabled or file has no history.
   */
  getHistory(fileUri: string): string[] {
    if (!this.isEnabled()) {
      return [];
    }
    return this.history.get(fileUri) || [];
  }

  /**
   * Clear history for a specific file, or all files if fileUri is undefined.
   */
  clear(fileUri?: string): void {
    if (fileUri === undefined) {
      this.history.clear();
    } else {
      this.history.delete(fileUri);
    }
  }
}
