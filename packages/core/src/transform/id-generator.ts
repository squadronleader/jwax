/**
 * ID Generator
 * Generates sequential IDs for each table
 */

export class IDGenerator {
  private counters: Map<string, number>;

  constructor() {
    this.counters = new Map();
  }

  nextId(tableName: string): number {
    const current = this.counters.get(tableName) || 0;
    const next = current + 1;
    this.counters.set(tableName, next);
    return next;
  }

  reset(): void {
    this.counters.clear();
  }

  getCount(tableName: string): number {
    return this.counters.get(tableName) || 0;
  }
}
