import { flattenJson } from '../../src/transform/flattener';
import { discoverSchema } from '../../src/schema';
import { IDGenerator } from '../../src/transform/id-generator';

describe('flattenJson', () => {
  describe('simple arrays', () => {
    it('should flatten simple array', () => {
      const json = {
        users: [
          { id: 1, name: 'Alice', age: 30 },
          { id: 2, name: 'Bob', age: 25 }
        ]
      };

      const schema = discoverSchema(json);
      const idGenerator = new IDGenerator();
      const results = flattenJson(json, schema, idGenerator);

      expect(results.length).toBe(1);
      
      const usersResult = results.find(r => r.tableName === 'users');
      expect(usersResult).toBeDefined();
      expect(usersResult!.rows.length).toBe(2);
      
      expect(usersResult!.rows[0]).toEqual({
        _id: 1,
        id: 1,
        name: 'Alice',
        age: 30
      });

      expect(usersResult!.rows[1]).toEqual({
        _id: 2,
        id: 2,
        name: 'Bob',
        age: 25
      });
    });

    it('should handle empty arrays', () => {
      const json = {
        users: []
      };

      const schema = discoverSchema(json);
      const idGenerator = new IDGenerator();
      const results = flattenJson(json, schema, idGenerator);

      const usersResult = results.find(r => r.tableName === 'users');
      expect(usersResult!.rows.length).toBe(0);
    });

    it('should handle null values', () => {
      const json = {
        users: [
          { id: 1, name: null }
        ]
      };

      const schema = discoverSchema(json);
      const idGenerator = new IDGenerator();
      const results = flattenJson(json, schema, idGenerator);

      expect(results[0].rows[0].name).toBe(null);
    });
  });

  describe('nested objects', () => {
    it('should flatten nested object into separate table', () => {
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

      const schema = discoverSchema(json);
      const idGenerator = new IDGenerator();
      const results = flattenJson(json, schema, idGenerator);

      expect(results.length).toBe(2);

      // Users table
      const usersResult = results.find(r => r.tableName === 'users');
      expect(usersResult!.rows.length).toBe(2);
      expect(usersResult!.rows[0]).toEqual({
        _id: 1,
        id: 1,
        name: 'Alice'
      });

      // Address table
      const addressResult = results.find(r => r.tableName === 'users_address');
      expect(addressResult!.rows.length).toBe(2);
      expect(addressResult!.rows[0]).toEqual({
        _id: 1,
        _pid: 1,
        city: 'NYC',
        zip: '10001'
      });
      expect(addressResult!.rows[1]).toEqual({
        _id: 2,
        _pid: 2,
        city: 'LA',
        zip: '90001'
      });
    });

    it('should maintain FK relationships', () => {
      const json = {
        users: [
          {
            id: 1,
            profile: {
              bio: 'Developer'
            }
          }
        ]
      };

      const schema = discoverSchema(json);
      const idGenerator = new IDGenerator();
      const results = flattenJson(json, schema, idGenerator);

      const usersResult = results.find(r => r.tableName === 'users');
      const profileResult = results.find(r => r.tableName === 'users_profile');

      const userId = usersResult!.rows[0]._id;
      const profileParentId = profileResult!.rows[0]._pid;

      expect(profileParentId).toBe(userId);
    });
  });

  describe('nested arrays', () => {
    it('should flatten nested arrays', () => {
      const json = {
        users: [
          {
            id: 1,
            orders: [
              { order_id: 101, total: 99.99 },
              { order_id: 102, total: 49.99 }
            ]
          }
        ]
      };

      const schema = discoverSchema(json);
      const idGenerator = new IDGenerator();
      const results = flattenJson(json, schema, idGenerator);

      const ordersResult = results.find(r => r.tableName === 'users_orders');
      expect(ordersResult!.rows.length).toBe(2);
      
      // Both orders should reference the same parent user
      expect(ordersResult!.rows[0]._pid).toBe(1);
      expect(ordersResult!.rows[1]._pid).toBe(1);
    });
  });

  describe('deeply nested', () => {
    it('should handle 3+ levels of nesting', () => {
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

      const schema = discoverSchema(json);
      const idGenerator = new IDGenerator();
      const results = flattenJson(json, schema, idGenerator);

      expect(results.length).toBe(3);

      const companyResult = results.find(r => r.tableName === 'company');
      const deptResult = results.find(r => r.tableName === 'company_departments');
      const empResult = results.find(r => r.tableName === 'company_departments_employees');

      expect(companyResult!.rows.length).toBe(1);
      expect(deptResult!.rows.length).toBe(1);
      expect(empResult!.rows.length).toBe(1);

      // Check FK chain
      const companyId = companyResult!.rows[0]._id;
      const deptParentId = deptResult!.rows[0]._pid;
      const deptId = deptResult!.rows[0]._id;
      const empParentId = empResult!.rows[0]._pid;

      expect(deptParentId).toBe(companyId);
      expect(empParentId).toBe(deptId);
    });
  });

  describe('multiple top-level arrays', () => {
    it('should flatten multiple independent tables', () => {
      const json = {
        users: [{ id: 1 }],
        orders: [{ id: 101 }]
      };

      const schema = discoverSchema(json);
      const idGenerator = new IDGenerator();
      const results = flattenJson(json, schema, idGenerator);

      expect(results.length).toBe(2);
      
      const usersResult = results.find(r => r.tableName === 'users');
      const ordersResult = results.find(r => r.tableName === 'orders');

      expect(usersResult!.rows.length).toBe(1);
      expect(ordersResult!.rows.length).toBe(1);
    });
  });

  describe('type coercion', () => {
    it('should coerce values to schema types', () => {
      const json = {
        items: [
          { id: '42', active: true, price: '19.99' }
        ]
      };

      const schema = discoverSchema(json);
      const idGenerator = new IDGenerator();
      const results = flattenJson(json, schema, idGenerator);

      const row = results[0].rows[0];
      
      // Check types are coerced properly
      expect(typeof row.id).toBe('string'); // TEXT (string in JSON)
      expect(typeof row.active).toBe('number'); // INTEGER (boolean -> 0/1)
      expect(row.active).toBe(1);
    });
  });

  describe('object tables', () => {
    it('should flatten top-level object into single-row table', () => {
      const json = {
        company: {
          id: 'comp-001',
          name: 'TechVenture',
          founded: '2015-03-15',
          employees: 450
        }
      };

      const schema = discoverSchema(json);
      const idGenerator = new IDGenerator();
      const results = flattenJson(json, schema, idGenerator);

      expect(results.length).toBe(1);
      
      const companyResult = results.find(r => r.tableName === 'company');
      expect(companyResult).toBeDefined();
      expect(companyResult!.rows.length).toBe(1);
      
      expect(companyResult!.rows[0]).toEqual({
        _id: 1,
        id: 'comp-001',
        name: 'TechVenture',
        founded: '2015-03-15',
        employees: 450
      });
    });

    it('should flatten object with nested array children', () => {
      const json = {
        company: {
          id: 'comp-001',
          name: 'TechVenture',
          departments: [
            { id: 'dept-001', name: 'Engineering' },
            { id: 'dept-002', name: 'Sales' }
          ]
        }
      };

      const schema = discoverSchema(json);
      const idGenerator = new IDGenerator();
      const results = flattenJson(json, schema, idGenerator);

      expect(results.length).toBe(2);

      // Company table should have 1 row
      const companyResult = results.find(r => r.tableName === 'company');
      expect(companyResult!.rows.length).toBe(1);
      expect(companyResult!.rows[0]).toMatchObject({
        _id: 1,
        id: 'comp-001',
        name: 'TechVenture'
      });

      // Departments table should have 2 rows, both referencing company
      const deptResult = results.find(r => r.tableName === 'company_departments');
      expect(deptResult!.rows.length).toBe(2);
      expect(deptResult!.rows[0]._pid).toBe(1); // references company._id
      expect(deptResult!.rows[1]._pid).toBe(1);
      expect(deptResult!.rows[0]).toMatchObject({
        id: 'dept-001',
        name: 'Engineering'
      });
    });

    it('should handle mix of object and array tables at root', () => {
      const json = {
        company: {
          id: 'comp-001',
          name: 'TechVenture'
        },
        products: [
          { id: 'prod-001', name: 'Widget' },
          { id: 'prod-002', name: 'Gadget' }
        ]
      };

      const schema = discoverSchema(json);
      const idGenerator = new IDGenerator();
      const results = flattenJson(json, schema, idGenerator);

      expect(results.length).toBe(2);

      const companyResult = results.find(r => r.tableName === 'company');
      expect(companyResult!.rows.length).toBe(1);
      expect(companyResult!.rows[0]).toMatchObject({
        id: 'comp-001',
        name: 'TechVenture'
      });

      const productsResult = results.find(r => r.tableName === 'products');
      expect(productsResult!.rows.length).toBe(2);
    });

    it('should handle deeply nested objects with FK chain', () => {
      const json = {
        company: {
          id: 'comp-001',
          headquarters: {
            address: '123 Main St',
            city: 'San Francisco',
            coordinates: {
              lat: 37.7749,
              lng: -122.4194
            }
          }
        }
      };

      const schema = discoverSchema(json);
      const idGenerator = new IDGenerator();
      const results = flattenJson(json, schema, idGenerator);

      expect(results.length).toBe(3);

      const companyResult = results.find(r => r.tableName === 'company');
      const hqResult = results.find(r => r.tableName === 'company_headquarters');
      const coordsResult = results.find(r => r.tableName === 'company_headquarters_coordinates');

      // Each should have 1 row
      expect(companyResult!.rows.length).toBe(1);
      expect(hqResult!.rows.length).toBe(1);
      expect(coordsResult!.rows.length).toBe(1);

      // Check FK relationships
      const companyId = companyResult!.rows[0]._id;
      const hqParentId = hqResult!.rows[0]._pid;
      const hqId = hqResult!.rows[0]._id;
      const coordsParentId = coordsResult!.rows[0]._pid;

      expect(hqParentId).toBe(companyId);
      expect(coordsParentId).toBe(hqId);

      // Check data
      expect(hqResult!.rows[0]).toMatchObject({
        address: '123 Main St',
        city: 'San Francisco'
      });
      expect(coordsResult!.rows[0]).toMatchObject({
        lat: 37.7749,
        lng: -122.4194
      });
    });
  });
});
