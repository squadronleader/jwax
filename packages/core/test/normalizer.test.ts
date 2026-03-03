import { normalizeJsonStructure, sanitizeTableName } from '../src/normalizer';

describe('normalizer', () => {
  describe('normalizeJsonStructure', () => {
    describe('root structure handling', () => {
      it('should wrap root array with default table name', () => {
        const input = [{ name: 'Alice' }, { name: 'Bob' }];
        const result = normalizeJsonStructure(input);

        expect(result).toEqual({ root: input });
      });

      it('should return root object as-is', () => {
        const input = { users: [{ name: 'Alice' }] };
        const result = normalizeJsonStructure(input);

        expect(result).toBe(input);
      });

      it('should return root primitive object as-is', () => {
        const input = { key: 'value' };
        const result = normalizeJsonStructure(input);

        expect(result).toBe(input);
      });
    });

    describe('explicit tableName override', () => {
      it('should use explicit tableName for root array', () => {
        const input = [{ id: 1 }, { id: 2 }];
        const result = normalizeJsonStructure(input, { tableName: 'items' });

        expect(result).toEqual({ items: input });
      });

      it('should prioritize tableName over source derivation', () => {
        const input = [{ id: 1 }];
        const result = normalizeJsonStructure(input, {
          tableName: 'custom',
          source: '/path/to/file.json'
        });

        expect(result).toEqual({ custom: input });
      });

      it('should sanitize explicit tableName', () => {
        const input = [{ id: 1 }];
        const result = normalizeJsonStructure(input, { tableName: 'my-table' });

        expect(result).toEqual({ my_table: input });
      });
    });

    describe('default table name', () => {
      it('should use "root" when no source or tableName is provided', () => {
        const input = [{ id: 1 }];
        const result = normalizeJsonStructure(input);

        expect(result).toEqual({ root: input });
      });

      it('should use "root" regardless of source (stdin)', () => {
        const input = [{ id: 1 }];
        const result = normalizeJsonStructure(input, { source: 'stdin' });

        expect(result).toEqual({ root: input });
      });

      it('should use "root" regardless of source (file path)', () => {
        const input = [{ id: 1 }];
        const result = normalizeJsonStructure(input, { source: '/path/to/users.json' });

        expect(result).toEqual({ root: input });
      });

      it('should use "root" regardless of source (URL)', () => {
        const input = [{ id: 1 }];
        const result = normalizeJsonStructure(input, {
          source: 'https://example.com/api/users.json'
        });

        expect(result).toEqual({ root: input });
      });
    });

    describe('edge cases', () => {
      it('should handle empty array', () => {
        const input: any[] = [];
        const result = normalizeJsonStructure(input);

        expect(result).toEqual({ root: input });
      });

      it('should handle array with null/undefined items', () => {
        const input = [null, undefined, { id: 1 }];
        const result = normalizeJsonStructure(input);

        expect(result).toEqual({ root: input });
      });

      it('should handle nested arrays (not unwrapped)', () => {
        const input = [[1, 2], [3, 4]];
        const result = normalizeJsonStructure(input);

        expect(result).toEqual({ root: input });
      });

      it('should handle object with array values', () => {
        const input = { users: [{ id: 1 }], products: [{ id: 2 }] };
        const result = normalizeJsonStructure(input);

        expect(result).toBe(input);
      });

      it('should handle very deep nesting', () => {
        const deep = { a: { b: { c: { d: { e: [{ id: 1 }] } } } } };
        const result = normalizeJsonStructure(deep);

        expect(result).toBe(deep);
      });
    });
  });

  describe('sanitizeTableName', () => {
    describe('special character handling', () => {
      it('should replace hyphens with underscores', () => {
        expect(sanitizeTableName('my-table')).toBe('my_table');
      });

      it('should replace spaces with underscores', () => {
        expect(sanitizeTableName('my table')).toBe('my_table');
      });

      it('should replace dots with underscores', () => {
        expect(sanitizeTableName('my.table')).toBe('my_table');
      });

      it('should replace multiple special chars', () => {
        expect(sanitizeTableName('my-data.table')).toBe('my_data_table');
      });

      it('should handle consecutive special characters', () => {
        expect(sanitizeTableName('my--table')).toBe('my__table');
      });

      it('should preserve alphanumeric and underscores', () => {
        expect(sanitizeTableName('my_table_123')).toBe('my_table_123');
      });
    });

    describe('leading number handling', () => {
      it('should prefix table starting with digit', () => {
        expect(sanitizeTableName('1users')).toBe('t_1users');
      });

      it('should handle all-digit names', () => {
        expect(sanitizeTableName('123')).toBe('t_123');
      });

      it('should not prefix non-digit names', () => {
        expect(sanitizeTableName('users123')).toBe('users123');
      });

      it('should prefix after sanitizing special chars', () => {
        expect(sanitizeTableName('1-users')).toBe('t_1_users');
      });
    });

    describe('fallback behavior', () => {
      it('should fallback to "data" for empty string', () => {
        expect(sanitizeTableName('')).toBe('data');
      });

      it('should convert only special characters to underscores', () => {
        expect(sanitizeTableName('---')).toBe('___');
      });

      it('should fallback to "data" for only digits with special chars', () => {
        expect(sanitizeTableName('1-2-3')).toBe('t_1_2_3');
      });

      it('should fallback to "data" for null', () => {
        expect(sanitizeTableName(null as any)).toBe('data');
      });

      it('should fallback to "data" for undefined', () => {
        expect(sanitizeTableName(undefined as any)).toBe('data');
      });
    });

    describe('unicode and special cases', () => {
      it('should handle unicode characters', () => {
        expect(sanitizeTableName('用户')).toBe('__');
      });

      it('should handle emoji', () => {
        expect(sanitizeTableName('users😀')).toBe('users__');
      });

      it('should handle mixed unicode and alphanumeric', () => {
        expect(sanitizeTableName('users_用户')).toBe('users___');
      });

      it('should handle very long names', () => {
        const longName = 'a'.repeat(100);
        expect(sanitizeTableName(longName)).toBe(longName);
      });
    });

    describe('realistic names', () => {
      it('should preserve valid SQL identifier', () => {
        expect(sanitizeTableName('users')).toBe('users');
      });

      it('should preserve snake_case', () => {
        expect(sanitizeTableName('user_profiles')).toBe('user_profiles');
      });

      it('should convert kebab-case to snake_case', () => {
        expect(sanitizeTableName('user-profiles')).toBe('user_profiles');
      });

      it('should convert CamelCase as-is', () => {
        expect(sanitizeTableName('UserProfiles')).toBe('UserProfiles');
      });
    });
  });
});
