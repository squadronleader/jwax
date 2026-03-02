import { QueryHistoryManager } from '../src/query-history';

describe('QueryHistoryManager', () => {
  it('should initialize with default max size of 5', () => {
    const manager = new QueryHistoryManager();
    expect(manager.isEnabled()).toBe(true);
  });

  it('should initialize with custom max size', () => {
    const manager = new QueryHistoryManager(10);
    expect(manager.isEnabled()).toBe(true);
  });

  it('should be disabled when maxSize is 0', () => {
    const manager = new QueryHistoryManager(0);
    expect(manager.isEnabled()).toBe(false);
  });

  describe('addQuery', () => {
    it('should add a query to history', () => {
      const manager = new QueryHistoryManager(5);
      manager.addQuery('file.json', 'SELECT * FROM users');
      expect(manager.getHistory('file.json')).toContain('SELECT * FROM users');
    });

    it('should place most recent query first', () => {
      const manager = new QueryHistoryManager(5);
      manager.addQuery('file.json', 'SELECT * FROM users');
      manager.addQuery('file.json', 'SELECT * FROM orders');
      const history = manager.getHistory('file.json');
      expect(history[0]).toBe('SELECT * FROM orders');
      expect(history[1]).toBe('SELECT * FROM users');
    });

    it('should trim whitespace from queries', () => {
      const manager = new QueryHistoryManager(5);
      manager.addQuery('file.json', '  SELECT * FROM users  ');
      expect(manager.getHistory('file.json')[0]).toBe('SELECT * FROM users');
    });

    it('should deduplicate queries (move existing to top)', () => {
      const manager = new QueryHistoryManager(5);
      manager.addQuery('file.json', 'SELECT * FROM users');
      manager.addQuery('file.json', 'SELECT * FROM orders');
      manager.addQuery('file.json', 'SELECT * FROM users'); // Add again
      const history = manager.getHistory('file.json');
      expect(history.length).toBe(2);
      expect(history[0]).toBe('SELECT * FROM users');
      expect(history[1]).toBe('SELECT * FROM orders');
    });

    it('should respect maxSize limit', () => {
      const manager = new QueryHistoryManager(3);
      manager.addQuery('file.json', 'Query 1');
      manager.addQuery('file.json', 'Query 2');
      manager.addQuery('file.json', 'Query 3');
      manager.addQuery('file.json', 'Query 4');
      manager.addQuery('file.json', 'Query 5');
      const history = manager.getHistory('file.json');
      expect(history.length).toBe(3);
      expect(history).toEqual(['Query 5', 'Query 4', 'Query 3']);
    });

    it('should not add empty or whitespace-only queries', () => {
      const manager = new QueryHistoryManager(5);
      manager.addQuery('file.json', '');
      manager.addQuery('file.json', '   ');
      manager.addQuery('file.json', '\t\n');
      expect(manager.getHistory('file.json')).toEqual([]);
    });

    it('should be no-op when disabled', () => {
      const manager = new QueryHistoryManager(0);
      manager.addQuery('file.json', 'SELECT * FROM users');
      expect(manager.getHistory('file.json')).toEqual([]);
    });
  });

  describe('getHistory', () => {
    it('should return empty array for file with no history', () => {
      const manager = new QueryHistoryManager(5);
      expect(manager.getHistory('unknown.json')).toEqual([]);
    });

    it('should return queries in most-recent-first order', () => {
      const manager = new QueryHistoryManager(5);
      manager.addQuery('file.json', 'Query 1');
      manager.addQuery('file.json', 'Query 2');
      manager.addQuery('file.json', 'Query 3');
      const history = manager.getHistory('file.json');
      expect(history).toEqual(['Query 3', 'Query 2', 'Query 1']);
    });

    it('should return empty array when disabled', () => {
      const manager = new QueryHistoryManager(5);
      manager.addQuery('file.json', 'SELECT * FROM users');
      manager.setMaxSize(0);
      expect(manager.getHistory('file.json')).toEqual([]);
    });
  });

  describe('per-file isolation', () => {
    it('should maintain separate history for different files', () => {
      const manager = new QueryHistoryManager(5);
      manager.addQuery('file1.json', 'Query A');
      manager.addQuery('file1.json', 'Query B');
      manager.addQuery('file2.json', 'Query X');
      manager.addQuery('file2.json', 'Query Y');

      expect(manager.getHistory('file1.json')).toEqual(['Query B', 'Query A']);
      expect(manager.getHistory('file2.json')).toEqual(['Query Y', 'Query X']);
    });

    it('should clear only specified file when clear is called with fileUri', () => {
      const manager = new QueryHistoryManager(5);
      manager.addQuery('file1.json', 'Query A');
      manager.addQuery('file2.json', 'Query X');
      manager.clear('file1.json');
      expect(manager.getHistory('file1.json')).toEqual([]);
      expect(manager.getHistory('file2.json')).toEqual(['Query X']);
    });
  });

  describe('setMaxSize', () => {
    it('should update maxSize', () => {
      const manager = new QueryHistoryManager(5);
      manager.setMaxSize(10);
      expect(manager.isEnabled()).toBe(true);
    });

    it('should disable history when set to 0', () => {
      const manager = new QueryHistoryManager(5);
      manager.addQuery('file.json', 'SELECT * FROM users');
      manager.setMaxSize(0);
      expect(manager.isEnabled()).toBe(false);
      expect(manager.getHistory('file.json')).toEqual([]);
    });

    it('should re-enable history when set to positive number', () => {
      const manager = new QueryHistoryManager(0);
      manager.setMaxSize(5);
      expect(manager.isEnabled()).toBe(true);
    });

    it('should trim existing histories when maxSize is reduced', () => {
      const manager = new QueryHistoryManager(5);
      manager.addQuery('file.json', 'Query 1');
      manager.addQuery('file.json', 'Query 2');
      manager.addQuery('file.json', 'Query 3');
      manager.addQuery('file.json', 'Query 4');
      manager.addQuery('file.json', 'Query 5');

      manager.setMaxSize(2);

      const history = manager.getHistory('file.json');
      expect(history.length).toBe(2);
      expect(history).toEqual(['Query 5', 'Query 4']);
    });

    it('should not trim existing histories when maxSize is increased', () => {
      const manager = new QueryHistoryManager(2);
      manager.addQuery('file.json', 'Query 1');
      manager.addQuery('file.json', 'Query 2');

      manager.setMaxSize(5);

      const history = manager.getHistory('file.json');
      expect(history.length).toBe(2);
      expect(history).toEqual(['Query 2', 'Query 1']);
    });

    it('should handle negative maxSize by treating as 0', () => {
      const manager = new QueryHistoryManager(5);
      manager.setMaxSize(-1);
      expect(manager.isEnabled()).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all history when called without fileUri', () => {
      const manager = new QueryHistoryManager(5);
      manager.addQuery('file1.json', 'Query A');
      manager.addQuery('file2.json', 'Query X');
      manager.clear();
      expect(manager.getHistory('file1.json')).toEqual([]);
      expect(manager.getHistory('file2.json')).toEqual([]);
    });

    it('should clear specific file history when fileUri is provided', () => {
      const manager = new QueryHistoryManager(5);
      manager.addQuery('file1.json', 'Query A');
      manager.addQuery('file2.json', 'Query X');
      manager.clear('file1.json');
      expect(manager.getHistory('file1.json')).toEqual([]);
      expect(manager.getHistory('file2.json')).toEqual(['Query X']);
    });
  });
});
