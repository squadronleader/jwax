import { QueryOrchestrator } from '../src/orchestrator';

describe('QueryOrchestrator', () => {
  let orchestrator: QueryOrchestrator;

  beforeEach(() => {
    orchestrator = new QueryOrchestrator();
  });

  afterEach(() => {
    orchestrator.close();
  });

  describe('loadJson and executeQuery', () => {
    it('should load simple JSON and execute queries', () => {
      const json = {
        users: [
          { id: 1, name: 'Alice', age: 30 },
          { id: 2, name: 'Bob', age: 25 }
        ]
      };

      orchestrator.loadJson(json);

      const result = orchestrator.executeQuery('SELECT * FROM users ORDER BY id');
      
      expect(result.headers).toEqual(['_id', 'id', 'name', 'age']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual([1, 1, 'Alice', 30]);
      expect(result.rows[1]).toEqual([2, 2, 'Bob', 25]);
    });

    it('should support WHERE clauses', () => {
      const json = {
        users: [
          { id: 1, name: 'Alice', age: 30 },
          { id: 2, name: 'Bob', age: 25 }
        ]
      };

      orchestrator.loadJson(json);

      const result = orchestrator.executeQuery('SELECT name FROM users WHERE age > 25');
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(['Alice']);
    });

    it('should support ORDER BY', () => {
      const json = {
        users: [
          { name: 'Charlie', age: 35 },
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 }
        ]
      };

      orchestrator.loadJson(json);

      const result = orchestrator.executeQuery('SELECT name FROM users ORDER BY age DESC');
      
      expect(result.rows[0]).toEqual(['Charlie']);
      expect(result.rows[1]).toEqual(['Alice']);
      expect(result.rows[2]).toEqual(['Bob']);
    });

    it('should support aggregations', () => {
      const json = {
        users: [
          { age: 30 },
          { age: 25 },
          { age: 35 }
        ]
      };

      orchestrator.loadJson(json);

      const result = orchestrator.executeQuery('SELECT COUNT(*) as count, AVG(age) as avg FROM users');
      
      expect(result.rows[0]).toEqual([3, 30]);
    });

    it('should support GROUP BY', () => {
      const json = {
        orders: [
          { city: 'NYC', amount: 100 },
          { city: 'LA', amount: 200 },
          { city: 'NYC', amount: 150 }
        ]
      };

      orchestrator.loadJson(json);

      const result = orchestrator.executeQuery(
        'SELECT city, SUM(amount) as total FROM orders GROUP BY city ORDER BY city'
      );
      
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(['LA', 200]);
      expect(result.rows[1]).toEqual(['NYC', 250]);
    });

    it('should throw error if querying before loading', () => {
      expect(() => {
        orchestrator.executeQuery('SELECT * FROM users');
      }).toThrow('No JSON data loaded');
    });
  });

  describe('nested objects (JOINs)', () => {
    it('should handle JOINs for nested objects', () => {
      const json = {
        users: [
          {
            id: 1,
            name: 'Alice',
            address: {
              city: 'NYC',
              zip: '10001'
            }
          },
          {
            id: 2,
            name: 'Bob',
            address: {
              city: 'LA',
              zip: '90001'
            }
          }
        ]
      };

      orchestrator.loadJson(json);

      const result = orchestrator.executeQuery(`
        SELECT u.name, a.city
        FROM users u
        JOIN users_address a ON u._id = a._pid
        ORDER BY u.name
      `);

      expect(result.headers).toEqual(['name', 'city']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(['Alice', 'NYC']);
      expect(result.rows[1]).toEqual(['Bob', 'LA']);
    });

    it('should handle deeply nested JOINs', () => {
      const json = {
        company: [
          {
            name: 'Acme',
            departments: [
              {
                name: 'Engineering',
                employees: [
                  { name: 'Alice' }
                ]
              }
            ]
          }
        ]
      };

      orchestrator.loadJson(json);

      const result = orchestrator.executeQuery(`
        SELECT c.name as company, d.name as dept, e.name as employee
        FROM company c
        JOIN company_departments d ON c._id = d._pid
        JOIN company_departments_employees e ON d._id = e._pid
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(['Acme', 'Engineering', 'Alice']);
    });
  });

  describe('multiple tables', () => {
    it('should handle multiple top-level arrays', () => {
      const json = {
        users: [{ id: 1, name: 'Alice' }],
        orders: [{ id: 101, total: 99.99 }]
      };

      orchestrator.loadJson(json);

      const usersResult = orchestrator.executeQuery('SELECT * FROM users');
      const ordersResult = orchestrator.executeQuery('SELECT * FROM orders');

      expect(usersResult.rows).toHaveLength(1);
      expect(ordersResult.rows).toHaveLength(1);
    });
  });

  describe('schema introspection', () => {
    it('should return discovered schema', () => {
      const json = {
        users: [{ id: 1, name: 'Alice' }]
      };

      orchestrator.loadJson(json);

      const schema = orchestrator.getSchema();
      
      expect(schema).not.toBeNull();
      expect(schema!.tables.size).toBe(1);
      expect(schema!.tables.has('users')).toBe(true);
    });

    it('should list all tables', () => {
      const json = {
        users: [{ id: 1 }],
        orders: [{ id: 101 }]
      };

      orchestrator.loadJson(json);

      const tables = orchestrator.listTables();
      
      expect(tables).toContain('users');
      expect(tables).toContain('orders');
    });

    it('should get table schema', () => {
      const json = {
        users: [{ id: 1, name: 'Alice' }]
      };

      orchestrator.loadJson(json);

      const tableSchema = orchestrator.getTableSchema('users');
      
      expect(tableSchema).not.toBeNull();
      expect(tableSchema!.name).toBe('users');
      expect(tableSchema!.columns.length).toBeGreaterThan(0);
    });
  });

  describe('inconsistent schemas (lenient mode)', () => {
    it('should handle arrays with objects having different fields', () => {
      const json = {
        people: [
          { id: 1, name: 'Alice', role: 'engineer', skills: 5 },
          { id: 2, name: 'Bob', role: 'sales', quota: 50000 }
        ]
      };

      orchestrator.loadJson(json);

      const result = orchestrator.executeQuery('SELECT * FROM people ORDER BY id');
      expect(result.rows).toHaveLength(2);
      expect(result.headers).toContain('skills');
      expect(result.headers).toContain('quota');
    });

    it('should reject inconsistent schemas in strict mode', () => {
      const json = {
        people: [
          { id: 1, name: 'Alice', skills: 5 },
          { id: 2, name: 'Bob', quota: 50000 }
        ]
      };

      const strictOrchestrator = new QueryOrchestrator('sqlite', { strictSchema: true });
      expect(() => strictOrchestrator.loadJson(json)).toThrow();
      strictOrchestrator.close();
    });
  });

  describe('reset and reload', () => {
    it('should allow reloading different JSON', () => {
      const json1 = {
        users: [{ id: 1, name: 'Alice' }]
      };

      orchestrator.loadJson(json1);
      let result = orchestrator.executeQuery('SELECT COUNT(*) as count FROM users');
      expect(result.rows[0]).toEqual([1]);

      const json2 = {
        users: [
          { id: 1, name: 'Bob' },
          { id: 2, name: 'Charlie' }
        ]
      };

      orchestrator.loadJson(json2);
      result = orchestrator.executeQuery('SELECT COUNT(*) as count FROM users');
      expect(result.rows[0]).toEqual([2]);
    });

    it('should clear old tables when loading new JSON', () => {
      const json1 = {
        users: [{ id: 1 }],
        orders: [{ id: 101 }]
      };

      orchestrator.loadJson(json1);
      expect(orchestrator.listTables()).toHaveLength(2);

      const json2 = {
        products: [{ id: 1 }]
      };

      orchestrator.loadJson(json2);
      expect(orchestrator.listTables()).toHaveLength(1);
      expect(orchestrator.listTables()).toContain('products');
    });
  });

  describe('edge cases', () => {
    it('should handle empty JSON', () => {
      orchestrator.loadJson({});
      
      const tables = orchestrator.listTables();
      expect(tables).toHaveLength(0);
    });

    it('should handle empty arrays', () => {
      const json = {
        users: []
      };

      orchestrator.loadJson(json);

      // Empty arrays create no table (can't have table with no columns)
      expect(() => {
        orchestrator.executeQuery('SELECT * FROM users');
      }).toThrow();
    });

    it('should handle null values', () => {
      const json = {
        users: [{ id: 1, name: null }]
      };

      orchestrator.loadJson(json);

      const result = orchestrator.executeQuery('SELECT * FROM users');
      expect(result.rows[0][2]).toBe(null); // name column
    });
  });
});
