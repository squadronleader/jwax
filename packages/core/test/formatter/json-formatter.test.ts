import { JsonFormatter } from '../../src/formatter/json-formatter';
import { QueryResult } from '../../src/engine/types';

describe('JsonFormatter', () => {
  let formatter: JsonFormatter;

  beforeEach(() => {
    formatter = new JsonFormatter();
  });

  describe('format', () => {
    it('should format empty results as empty array', () => {
      const result: QueryResult = {
        headers: ['id', 'name'],
        rows: [],
      };

      const output = formatter.format(result);
      const parsed = JSON.parse(output);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(0);
    });

    it('should format single row as array with one object', () => {
      const result: QueryResult = {
        headers: ['id', 'name'],
        rows: [[1, 'Alice']],
      };

      const output = formatter.format(result);
      const parsed = JSON.parse(output);
      
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toEqual({ id: 1, name: 'Alice' });
    });

    it('should format multiple rows', () => {
      const result: QueryResult = {
        headers: ['id', 'name', 'age'],
        rows: [
          [1, 'Alice', 30],
          [2, 'Bob', 25],
          [3, 'Charlie', 35],
        ],
      };

      const output = formatter.format(result);
      const parsed = JSON.parse(output);
      
      expect(parsed).toHaveLength(3);
      expect(parsed[0]).toEqual({ id: 1, name: 'Alice', age: 30 });
      expect(parsed[1]).toEqual({ id: 2, name: 'Bob', age: 25 });
      expect(parsed[2]).toEqual({ id: 3, name: 'Charlie', age: 35 });
    });

    it('should handle null values', () => {
      const result: QueryResult = {
        headers: ['id', 'name', 'email'],
        rows: [
          [1, 'Alice', null],
          [2, null, 'bob@example.com'],
        ],
      };

      const output = formatter.format(result);
      const parsed = JSON.parse(output);
      
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({ id: 1, name: 'Alice', email: null });
      expect(parsed[1]).toEqual({ id: 2, name: null, email: 'bob@example.com' });
    });

    it('should handle undefined values', () => {
      const result: QueryResult = {
        headers: ['id', 'name'],
        rows: [[1, undefined]],
      };

      const output = formatter.format(result);
      const parsed = JSON.parse(output);
      
      expect(parsed).toHaveLength(1);
      // undefined becomes null in JSON
      expect(parsed[0]).toEqual({ id: 1, name: undefined });
    });

    it('should preserve number types', () => {
      const result: QueryResult = {
        headers: ['id', 'score', 'percentage'],
        rows: [[1, 100, 98.5]],
      };

      const output = formatter.format(result);
      const parsed = JSON.parse(output);
      
      expect(parsed[0].id).toBe(1);
      expect(parsed[0].score).toBe(100);
      expect(parsed[0].percentage).toBe(98.5);
      expect(typeof parsed[0].id).toBe('number');
      expect(typeof parsed[0].score).toBe('number');
      expect(typeof parsed[0].percentage).toBe('number');
    });

    it('should preserve string types', () => {
      const result: QueryResult = {
        headers: ['id', 'name'],
        rows: [[1, 'Alice']],
      };

      const output = formatter.format(result);
      const parsed = JSON.parse(output);
      
      expect(typeof parsed[0].name).toBe('string');
      expect(parsed[0].name).toBe('Alice');
    });

    it('should preserve boolean types', () => {
      const result: QueryResult = {
        headers: ['id', 'active', 'verified'],
        rows: [[1, true, false]],
      };

      const output = formatter.format(result);
      const parsed = JSON.parse(output);
      
      expect(typeof parsed[0].active).toBe('boolean');
      expect(typeof parsed[0].verified).toBe('boolean');
      expect(parsed[0].active).toBe(true);
      expect(parsed[0].verified).toBe(false);
    });

    it('should handle mixed types in same column', () => {
      const result: QueryResult = {
        headers: ['id', 'value'],
        rows: [
          [1, 'string'],
          [2, 42],
          [3, true],
          [4, null],
        ],
      };

      const output = formatter.format(result);
      const parsed = JSON.parse(output);
      
      expect(parsed).toHaveLength(4);
      expect(parsed[0].value).toBe('string');
      expect(parsed[1].value).toBe(42);
      expect(parsed[2].value).toBe(true);
      expect(parsed[3].value).toBe(null);
    });

    it('should produce valid JSON', () => {
      const result: QueryResult = {
        headers: ['id', 'name', 'data'],
        rows: [
          [1, 'Test', 'Some "quoted" text'],
          [2, "O'Brien", 'Line\nbreak'],
        ],
      };

      const output = formatter.format(result);
      
      // Should not throw
      expect(() => JSON.parse(output)).not.toThrow();
      
      const parsed = JSON.parse(output);
      expect(parsed[0].data).toBe('Some "quoted" text');
      expect(parsed[1].name).toBe("O'Brien");
      expect(parsed[1].data).toBe('Line\nbreak');
    });

    it('should use pretty-print format', () => {
      const result: QueryResult = {
        headers: ['id', 'name'],
        rows: [[1, 'Alice']],
      };

      const output = formatter.format(result);
      
      // Pretty-printed JSON should contain newlines and indentation
      expect(output).toContain('\n');
      expect(output).toContain('  '); // 2-space indentation
    });

    it('should map headers to object keys correctly', () => {
      const result: QueryResult = {
        headers: ['user_id', 'user_name', 'user_email'],
        rows: [[123, 'Alice', 'alice@example.com']],
      };

      const output = formatter.format(result);
      const parsed = JSON.parse(output);
      
      expect(parsed[0]).toHaveProperty('user_id', 123);
      expect(parsed[0]).toHaveProperty('user_name', 'Alice');
      expect(parsed[0]).toHaveProperty('user_email', 'alice@example.com');
    });

    it('should handle special characters in header names', () => {
      const result: QueryResult = {
        headers: ['id', 'name with spaces', 'email-address'],
        rows: [[1, 'Alice', 'alice@test.com']],
      };

      const output = formatter.format(result);
      const parsed = JSON.parse(output);
      
      expect(parsed[0]).toHaveProperty('id', 1);
      expect(parsed[0]).toHaveProperty('name with spaces', 'Alice');
      expect(parsed[0]).toHaveProperty('email-address', 'alice@test.com');
    });
  });
});
