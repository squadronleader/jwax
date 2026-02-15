import { createEngine, SQLEngineAdapter, ColumnDef } from '../../src/engine';

describe('SQLiteAdapter', () => {
  let engine: SQLEngineAdapter;

  beforeEach(() => {
    engine = createEngine('sqlite');
  });

  afterEach(() => {
    engine.close();
  });

  describe('createTable', () => {
    it('should create a simple table', () => {
      const columns: ColumnDef[] = [
        { name: 'id', type: 'INTEGER', primaryKey: true },
        { name: 'name', type: 'TEXT' }
      ];

      expect(() => engine.createTable('users', columns)).not.toThrow();
    });

    it('should handle various column types', () => {
      const columns: ColumnDef[] = [
        { name: 'id', type: 'INTEGER' },
        { name: 'name', type: 'TEXT' },
        { name: 'score', type: 'REAL' },
        { name: 'data', type: 'BLOB' }
      ];

      expect(() => engine.createTable('test', columns)).not.toThrow();
    });

    it('should handle NOT NULL constraints', () => {
      const columns: ColumnDef[] = [
        { name: 'id', type: 'INTEGER', primaryKey: true },
        { name: 'required', type: 'TEXT', nullable: false }
      ];

      engine.createTable('test', columns);
      engine.insert('test', [{ id: 1, required: 'value' }]);
      
      // Should fail when required field is null
      expect(() => {
        engine.insert('test', [{ id: 2, required: null }]);
      }).toThrow();
    });

    it('should escape special characters in table names', () => {
      const columns: ColumnDef[] = [
        { name: 'id', type: 'INTEGER' }
      ];

      expect(() => engine.createTable('users-table', columns)).not.toThrow();
    });

    it('should escape special characters in column names', () => {
      const columns: ColumnDef[] = [
        { name: 'id', type: 'INTEGER' },
        { name: 'column-name', type: 'TEXT' }
      ];

      expect(() => engine.createTable('test', columns)).not.toThrow();
    });
  });

  describe('insert', () => {
    beforeEach(() => {
      const columns: ColumnDef[] = [
        { name: 'id', type: 'INTEGER' },
        { name: 'name', type: 'TEXT' },
        { name: 'age', type: 'INTEGER' }
      ];
      engine.createTable('users', columns);
    });

    it('should insert a single row', () => {
      const rows = [{ id: 1, name: 'Alice', age: 30 }];
      expect(() => engine.insert('users', rows)).not.toThrow();

      const result = engine.query('SELECT * FROM users');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual([1, 'Alice', 30]);
    });

    it('should insert multiple rows', () => {
      const rows = [
        { id: 1, name: 'Alice', age: 30 },
        { id: 2, name: 'Bob', age: 25 },
        { id: 3, name: 'Charlie', age: 35 }
      ];
      engine.insert('users', rows);

      const result = engine.query('SELECT * FROM users');
      expect(result.rows).toHaveLength(3);
    });

    it('should handle empty array', () => {
      expect(() => engine.insert('users', [])).not.toThrow();
      
      const result = engine.query('SELECT * FROM users');
      expect(result.rows).toHaveLength(0);
    });

    it('should handle NULL values', () => {
      const rows = [{ id: 1, name: null, age: 30 }];
      engine.insert('users', rows);

      const result = engine.query('SELECT * FROM users WHERE id = 1');
      expect(result.rows[0]).toEqual([1, null, 30]);
    });
  });

  describe('query', () => {
    beforeEach(() => {
      const columns: ColumnDef[] = [
        { name: 'id', type: 'INTEGER' },
        { name: 'name', type: 'TEXT' },
        { name: 'age', type: 'INTEGER' }
      ];
      engine.createTable('users', columns);
      engine.insert('users', [
        { id: 1, name: 'Alice', age: 30 },
        { id: 2, name: 'Bob', age: 25 },
        { id: 3, name: 'Charlie', age: 35 }
      ]);
    });

    it('should return correct format', () => {
      const result = engine.query('SELECT * FROM users');
      
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('rows');
      expect(Array.isArray(result.headers)).toBe(true);
      expect(Array.isArray(result.rows)).toBe(true);
    });

    it('should return all rows with SELECT *', () => {
      const result = engine.query('SELECT * FROM users');
      
      expect(result.headers).toEqual(['id', 'name', 'age']);
      expect(result.rows).toHaveLength(3);
    });

    it('should handle WHERE clause', () => {
      const result = engine.query('SELECT * FROM users WHERE age > 25');
      
      expect(result.rows).toHaveLength(2);
    });

    it('should handle ORDER BY', () => {
      const result = engine.query('SELECT name FROM users ORDER BY age DESC');
      
      expect(result.rows[0]).toEqual(['Charlie']);
      expect(result.rows[1]).toEqual(['Alice']);
      expect(result.rows[2]).toEqual(['Bob']);
    });

    it('should handle specific columns', () => {
      const result = engine.query('SELECT name, age FROM users WHERE id = 2');
      
      expect(result.headers).toEqual(['name', 'age']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(['Bob', 25]);
    });

    it('should return empty result for no matches', () => {
      const result = engine.query('SELECT * FROM users WHERE id = 999');
      
      expect(result.headers).toEqual([]);
      expect(result.rows).toHaveLength(0);
    });

    it('should handle aggregations', () => {
      const result = engine.query('SELECT COUNT(*) as count FROM users');
      
      expect(result.headers).toEqual(['count']);
      expect(result.rows[0]).toEqual([3]);
    });

    it('should handle GROUP BY', () => {
      const result = engine.query('SELECT age, COUNT(*) as count FROM users GROUP BY age ORDER BY age');
      
      expect(result.headers).toEqual(['age', 'count']);
      expect(result.rows).toHaveLength(3);
    });

    it('should throw error for invalid SQL', () => {
      expect(() => {
        engine.query('INVALID SQL QUERY');
      }).toThrow(/SQL Error/);
    });
  });

  describe('reset', () => {
    it('should drop all tables', () => {
      const columns: ColumnDef[] = [
        { name: 'id', type: 'INTEGER' }
      ];
      
      engine.createTable('users', columns);
      engine.createTable('orders', columns);
      engine.insert('users', [{ id: 1 }]);

      engine.reset();

      // Tables should no longer exist
      expect(() => {
        engine.query('SELECT * FROM users');
      }).toThrow();
    });

    it('should allow creating tables after reset', () => {
      const columns: ColumnDef[] = [
        { name: 'id', type: 'INTEGER' }
      ];
      
      engine.createTable('test', columns);
      engine.reset();
      
      expect(() => engine.createTable('test', columns)).not.toThrow();
    });
  });

  describe('JOINs', () => {
    beforeEach(() => {
      engine.createTable('users', [
        { name: '_id', type: 'INTEGER', primaryKey: true },
        { name: 'name', type: 'TEXT' }
      ]);
      
      engine.createTable('orders', [
        { name: '_id', type: 'INTEGER', primaryKey: true },
        { name: '_parent_id', type: 'INTEGER' },
        { name: 'total', type: 'REAL' }
      ]);

      engine.insert('users', [
        { _id: 1, name: 'Alice' },
        { _id: 2, name: 'Bob' }
      ]);

      engine.insert('orders', [
        { _id: 1, _parent_id: 1, total: 99.99 },
        { _id: 2, _parent_id: 1, total: 49.99 },
        { _id: 3, _parent_id: 2, total: 199.99 }
      ]);
    });

    it('should handle INNER JOIN', () => {
      const result = engine.query(`
        SELECT u.name, o.total 
        FROM users u 
        JOIN orders o ON u._id = o._parent_id
        ORDER BY o.total
      `);

      expect(result.headers).toEqual(['name', 'total']);
      expect(result.rows).toHaveLength(3);
      expect(result.rows[0]).toEqual(['Alice', 49.99]);
    });

    it('should handle multiple JOINs', () => {
      engine.createTable('items', [
        { name: '_id', type: 'INTEGER', primaryKey: true },
        { name: '_parent_id', type: 'INTEGER' },
        { name: 'product', type: 'TEXT' }
      ]);

      engine.insert('items', [
        { _id: 1, _parent_id: 1, product: 'Widget' }
      ]);

      const result = engine.query(`
        SELECT u.name, o.total, i.product
        FROM users u
        JOIN orders o ON u._id = o._parent_id
        JOIN items i ON o._id = i._parent_id
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(['Alice', 99.99, 'Widget']);
    });
  });

  describe('close', () => {
    it('should close the database connection', () => {
      expect(() => engine.close()).not.toThrow();
    });

    it('should not allow queries after closing', () => {
      engine.close();
      
      expect(() => {
        engine.query('SELECT 1');
      }).toThrow();
    });
  });
});
