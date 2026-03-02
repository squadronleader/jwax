import { SqlJsAdapter } from '../src/sqljs-adapter';

describe('SqlJsAdapter', () => {
  let adapter: SqlJsAdapter;

  beforeEach(async () => {
    adapter = await SqlJsAdapter.create();
  });

  afterEach(() => {
    adapter.close();
  });

  describe('createTable', () => {
    it('should create a table with columns', () => {
      adapter.createTable('users', [
        { name: 'id', type: 'INTEGER', primaryKey: true },
        { name: 'name', type: 'TEXT' },
      ]);

      const result = adapter.query("SELECT name FROM sqlite_master WHERE type='table'");
      expect(result.rows).toEqual([['users']]);
    });

    it('should skip creation for empty columns', () => {
      adapter.createTable('empty', []);
      const result = adapter.query("SELECT name FROM sqlite_master WHERE type='table'");
      expect(result.rows).toEqual([]);
    });
  });

  describe('insert', () => {
    beforeEach(() => {
      adapter.createTable('users', [
        { name: 'id', type: 'INTEGER' },
        { name: 'name', type: 'TEXT' },
      ]);
    });

    it('should insert rows', () => {
      adapter.insert('users', [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      const result = adapter.query('SELECT * FROM users ORDER BY id');
      expect(result.headers).toEqual(['id', 'name']);
      expect(result.rows).toEqual([
        [1, 'Alice'],
        [2, 'Bob'],
      ]);
    });

    it('should skip insert for empty rows', () => {
      adapter.insert('users', []);
      const result = adapter.query('SELECT * FROM users');
      expect(result.rows).toEqual([]);
    });
  });

  describe('query', () => {
    beforeEach(() => {
      adapter.createTable('users', [
        { name: 'id', type: 'INTEGER' },
        { name: 'name', type: 'TEXT' },
        { name: 'age', type: 'INTEGER' },
      ]);
      adapter.insert('users', [
        { id: 1, name: 'Alice', age: 30 },
        { id: 2, name: 'Bob', age: 25 },
      ]);
    });

    it('should return headers and rows', () => {
      const result = adapter.query('SELECT * FROM users ORDER BY id');
      expect(result.headers).toEqual(['id', 'name', 'age']);
      expect(result.rows.length).toBe(2);
    });

    it('should handle WHERE clauses', () => {
      const result = adapter.query('SELECT name FROM users WHERE age > 28');
      expect(result.rows).toEqual([['Alice']]);
    });

    it('should return empty result for no matches', () => {
      const result = adapter.query('SELECT * FROM users WHERE id = 999');
      expect(result.headers).toEqual([]);
      expect(result.rows).toEqual([]);
    });

    it('should throw on invalid SQL', () => {
      expect(() => adapter.query('SELECT * FROM nonexistent')).toThrow('SQL Error');
    });

    it('should support aggregations', () => {
      const result = adapter.query('SELECT COUNT(*) as cnt FROM users');
      expect(result.rows).toEqual([[2]]);
    });
  });

  describe('reset', () => {
    it('should drop all tables', () => {
      adapter.createTable('users', [{ name: 'id', type: 'INTEGER' }]);
      adapter.createTable('orders', [{ name: 'id', type: 'INTEGER' }]);

      adapter.reset();

      const result = adapter.query("SELECT name FROM sqlite_master WHERE type='table'");
      expect(result.rows).toEqual([]);
    });
  });

  describe('identifier escaping', () => {
    it('should handle special characters in table names', () => {
      adapter.createTable('my-table', [{ name: 'my-col', type: 'TEXT' }]);
      adapter.insert('my-table', [{ 'my-col': 'value' }]);

      const result = adapter.query('SELECT "my-col" FROM "my-table"');
      expect(result.rows).toEqual([['value']]);
    });
  });
});
