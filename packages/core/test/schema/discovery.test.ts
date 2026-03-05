import { discoverSchema } from '../../src/schema/discovery';
import * as fs from 'fs';
import * as path from 'path';

describe('discoverSchema', () => {
  describe('simple arrays', () => {
    it('should discover single top-level array', () => {
      const json = {
        users: [
          { id: 1, name: 'Alice', age: 30 },
          { id: 2, name: 'Bob', age: 25 }
        ]
      };

      const schema = discoverSchema(json);

      expect(schema.tables.size).toBe(1);
      expect(schema.rootTables).toEqual(['users']);

      const usersTable = schema.tables.get('users');
      expect(usersTable).toBeDefined();
      expect(usersTable?.name).toBe('users');
      expect(usersTable?.path).toEqual(['users']);
      expect(usersTable?.primaryKey).toBe('_id');
      expect(usersTable?.parentTable).toBeUndefined();

      // Check columns
      const columns = usersTable?.columns || [];
      expect(columns.length).toBe(4); // _id, id, name, age
      expect(columns[0].name).toBe('_id');
      expect(columns[0].primaryKey).toBe(true);
    });

    it('should discover multiple top-level arrays', () => {
      const json = {
        users: [{ id: 1 }],
        orders: [{ id: 101 }]
      };

      const schema = discoverSchema(json);

      expect(schema.tables.size).toBe(2);
      expect(schema.rootTables).toContain('users');
      expect(schema.rootTables).toContain('orders');
    });

    it('should handle empty arrays', () => {
      const json = {
        users: []
      };

      const schema = discoverSchema(json);

      expect(schema.tables.size).toBe(1);
      const usersTable = schema.tables.get('users');
      expect(usersTable?.columns.length).toBe(0); // No columns for empty array
    });
  });

  describe('nested objects', () => {
    it('should create separate table for nested object', () => {
      const json = {
        users: [
          {
            id: 1,
            name: 'Alice',
            address: {
              city: 'NYC',
              zip: '10001'
            }
          }
        ]
      };

      const schema = discoverSchema(json);

      expect(schema.tables.size).toBe(2);
      expect(schema.rootTables).toEqual(['users']);

      // Users table
      const usersTable = schema.tables.get('users');
      expect(usersTable?.columns.map(c => c.name)).toEqual(['_id', 'id', 'name']);

      // Address table
      const addressTable = schema.tables.get('users_address');
      expect(addressTable).toBeDefined();
      expect(addressTable?.name).toBe('users_address');
      expect(addressTable?.path).toEqual(['users', 'address']);
      expect(addressTable?.parentTable).toBe('users');
      expect(addressTable?.parentKey).toBe('_pid');

      const addressColumns = addressTable?.columns.map(c => c.name) || [];
      expect(addressColumns).toContain('_id');
      expect(addressColumns).toContain('_pid');
      expect(addressColumns).toContain('city');
      expect(addressColumns).toContain('zip');
    });

    it('should handle deeply nested objects', () => {
      const json = {
        users: [
          {
            id: 1,
            profile: {
              bio: 'test',
              settings: {
                theme: 'dark'
              }
            }
          }
        ]
      };

      const schema = discoverSchema(json);

      expect(schema.tables.size).toBe(3);
      expect(schema.tables.has('users')).toBe(true);
      expect(schema.tables.has('users_profile')).toBe(true);
      expect(schema.tables.has('users_profile_settings')).toBe(true);

      const settingsTable = schema.tables.get('users_profile_settings');
      expect(settingsTable?.parentTable).toBe('users_profile');
    });
  });

  describe('nested arrays', () => {
    it('should create separate table for nested array', () => {
      const json = {
        users: [
          {
            id: 1,
            orders: [
              { order_id: 101, total: 99.99 }
            ]
          }
        ]
      };

      const schema = discoverSchema(json);

      expect(schema.tables.size).toBe(2);

      const ordersTable = schema.tables.get('users_orders');
      expect(ordersTable).toBeDefined();
      expect(ordersTable?.parentTable).toBe('users');
      expect(ordersTable?.path).toEqual(['users', 'orders']);
    });
  });

  describe('polymorphic path shapes', () => {
    it('should merge object and array observations into one child table schema', () => {
      const json = {
        items: [
          { field2: { stuff: { only_object: 'v1' } } },
          { field2: { stuff: [{ only_array: 'v2' }] } }
        ]
      };

      const schema = discoverSchema(json);

      const stuffTable = schema.tables.get('items_field2_stuff');
      expect(stuffTable).toBeDefined();
      expect(stuffTable?.parentTable).toBe('items_field2');
      expect(stuffTable?.columns.map(c => c.name)).toEqual(
        expect.arrayContaining(['_id', '_pid', 'only_object', 'only_array'])
      );
    });

    it('should keep scalar value on parent table when scalar and array coexist at same path', () => {
      const json = {
        items: [
          { field2: { stuff: 'scalar-value' } },
          { field2: { stuff: [{ array_value: 'v2' }] } }
        ]
      };

      const schema = discoverSchema(json);

      const parentTable = schema.tables.get('items_field2');
      expect(parentTable).toBeDefined();
      expect(parentTable?.columns.map(c => c.name)).toContain('stuff');

      const stuffTable = schema.tables.get('items_field2_stuff');
      expect(stuffTable).toBeDefined();
      expect(stuffTable?.columns.map(c => c.name)).toEqual(
        expect.arrayContaining(['_id', '_pid', 'array_value'])
      );
    });
  });

  describe('test fixtures', () => {
    it('should handle simple.json', () => {
      const json = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../fixtures/simple.json'), 'utf8')
      );

      const schema = discoverSchema(json);

      expect(schema.tables.has('users')).toBe(true);
      const usersTable = schema.tables.get('users');
      expect(usersTable?.columns.length).toBeGreaterThan(1);
    });

    it('should handle nested.json', () => {
      const json = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../fixtures/nested.json'), 'utf8')
      );

      const schema = discoverSchema(json);

      expect(schema.tables.has('users')).toBe(true);
      expect(schema.tables.has('users_address')).toBe(true);
      
      const addressTable = schema.tables.get('users_address');
      expect(addressTable?.parentTable).toBe('users');
    });

    it('should handle multi-table.json', () => {
      const json = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../fixtures/multi-table.json'), 'utf8')
      );

      const schema = discoverSchema(json);

      expect(schema.tables.has('users')).toBe(true);
      expect(schema.tables.has('orders')).toBe(true);
      expect(schema.rootTables.length).toBe(2);
    });

    it('should handle edge-cases.json', () => {
      const json = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../fixtures/edge-cases.json'), 'utf8')
      );

      const schema = discoverSchema(json);

      expect(schema.tables.has('items')).toBe(true);
      expect(schema.tables.has('empty')).toBe(true);
      
      // Empty array should have no columns
      const emptyTable = schema.tables.get('empty');
      expect(emptyTable?.columns.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle null root', () => {
      const schema = discoverSchema(null);
      expect(schema.tables.size).toBe(0);
    });

    it('should handle empty object', () => {
      const schema = discoverSchema({});
      expect(schema.tables.size).toBe(0);
    });

    it('should handle array at root', () => {
      const json = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ];

      const schema = discoverSchema(json);
      
      // Array at root should not create a table
      // (we expect {users: [...]} format)
      expect(schema.tables.size).toBe(0);
    });
  });

  describe('object tables', () => {
    it('should create table for top-level object', () => {
      const json = {
        company: {
          id: 'comp-001',
          name: 'TechVenture',
          founded: '2015-03-15',
          employees: 450
        }
      };

      const schema = discoverSchema(json);

      expect(schema.tables.size).toBe(1);
      expect(schema.tables.has('company')).toBe(true);

      const companyTable = schema.tables.get('company');
      expect(companyTable?.name).toBe('company');
      expect(companyTable?.path).toEqual(['company']);
      expect(companyTable?.primaryKey).toBe('_id');
      
      // Check columns - should have _id plus the object fields
      const columns = companyTable?.columns || [];
      expect(columns.length).toBe(5); // _id, id, name, founded, employees
      expect(columns[0].name).toBe('_id');
      expect(columns.map(c => c.name)).toContain('id');
      expect(columns.map(c => c.name)).toContain('name');
      expect(columns.map(c => c.name)).toContain('founded');
      expect(columns.map(c => c.name)).toContain('employees');
    });

    it('should create tables for nested object with array children', () => {
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

      expect(schema.tables.size).toBe(2);
      expect(schema.tables.has('company')).toBe(true);
      expect(schema.tables.has('company_departments')).toBe(true);

      const companyTable = schema.tables.get('company');
      expect(companyTable?.columns.map(c => c.name)).toContain('id');
      expect(companyTable?.columns.map(c => c.name)).toContain('name');
      expect(companyTable?.parentTable).toBeUndefined();

      const deptTable = schema.tables.get('company_departments');
      expect(deptTable?.parentTable).toBe('company');
      expect(deptTable?.path).toEqual(['company', 'departments']);
    });

    it('should handle mix of objects and arrays at root', () => {
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

      expect(schema.tables.size).toBe(2);
      expect(schema.tables.has('company')).toBe(true);
      expect(schema.tables.has('products')).toBe(true);
      expect(schema.rootTables).toContain('company');
      expect(schema.rootTables).toContain('products');

      // Company should be a table even though it's an object
      const companyTable = schema.tables.get('company');
      expect(companyTable?.parentTable).toBeUndefined();
    });

    it('should handle deeply nested objects', () => {
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

      expect(schema.tables.size).toBe(3);
      expect(schema.tables.has('company')).toBe(true);
      expect(schema.tables.has('company_headquarters')).toBe(true);
      expect(schema.tables.has('company_headquarters_coordinates')).toBe(true);

      const hqTable = schema.tables.get('company_headquarters');
      expect(hqTable?.parentTable).toBe('company');

      const coordsTable = schema.tables.get('company_headquarters_coordinates');
      expect(coordsTable?.parentTable).toBe('company_headquarters');
    });
  });

  describe('root scalar tables', () => {
    it('should create root table and child table when root has scalars and nested object', () => {
      const json = { root: 'val', child: { child1: 1 } };
      const schema = discoverSchema(json);
      expect(schema.tables.size).toBe(2);
      expect(schema.tables.has('root')).toBe(true);
      expect(schema.tables.has('child')).toBe(true);
      expect(schema.rootTables).toContain('root');
      expect(schema.rootTables).not.toContain('child');
      const rootTable = schema.tables.get('root')!;
      expect(rootTable.columns.map(c => c.name)).toContain('root');
      const childTable = schema.tables.get('child')!;
      expect(childTable.parentTable).toBe('root');
      expect(childTable.parentKey).toBe('_pid');
      expect(childTable.columns.map(c => c.name)).toContain('_pid');
      expect(childTable.columns.map(c => c.name)).toContain('child1');
    });

    it('should create root table and items table when root has scalars and nested array', () => {
      const json = { root: 'val', items: [{ id: 1 }] };
      const schema = discoverSchema(json);
      expect(schema.tables.size).toBe(2);
      expect(schema.tables.has('root')).toBe(true);
      expect(schema.tables.has('items')).toBe(true);
      const itemsTable = schema.tables.get('items')!;
      expect(itemsTable.parentTable).toBe('root');
      expect(itemsTable.columns.map(c => c.name)).toContain('_pid');
    });

    it('should create root table with scalar columns only when there are no children', () => {
      const json = { test: 'val', test2: 123 };
      const schema = discoverSchema(json);
      expect(schema.tables.size).toBe(1);
      expect(schema.tables.has('root')).toBe(true);
      const rootTable = schema.tables.get('root')!;
      expect(rootTable.columns.map(c => c.name)).toContain('_id');
      expect(rootTable.columns.map(c => c.name)).toContain('test');
      expect(rootTable.columns.map(c => c.name)).toContain('test2');
    });

    it('should create correct parent chain for deeply nested children when root has scalars', () => {
      const json = { label: 'top', child: { name: 'c1', grand: { x: 1 } } };
      const schema = discoverSchema(json);
      expect(schema.tables.size).toBe(3);
      expect(schema.tables.has('root')).toBe(true);
      expect(schema.tables.has('child')).toBe(true);
      expect(schema.tables.has('child_grand')).toBe(true);
      expect(schema.tables.get('child')!.parentTable).toBe('root');
      expect(schema.tables.get('child_grand')!.parentTable).toBe('child');
    });

    it('should handle mixed scalars, nested object, and nested array at root', () => {
      const json = { title: 't', meta: { k: 1 }, tags: [{ v: 2 }] };
      const schema = discoverSchema(json);
      expect(schema.tables.size).toBe(3);
      expect(schema.tables.has('root')).toBe(true);
      expect(schema.tables.has('meta')).toBe(true);
      expect(schema.tables.has('tags')).toBe(true);
      expect(schema.tables.get('meta')!.parentTable).toBe('root');
      expect(schema.tables.get('tags')!.parentTable).toBe('root');
      expect(schema.rootTables).toEqual(['root']);
    });
  });
});
