import { normalizeJsonStructure, sanitizeTableName } from '../src/normalizer';

describe('normalizer', () => {
  describe('normalizeJsonStructure', () => {
    describe('root structure handling', () => {
      it('should wrap root array with default table name', () => {
        const input = [{ name: 'Alice' }, { name: 'Bob' }];
        const result = normalizeJsonStructure(input);

        expect(result).toEqual({ data: input });
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

    describe('table name derivation from source', () => {
      it('should use "data" for stdin source', () => {
        const input = [{ id: 1 }];
        const result = normalizeJsonStructure(input, { source: 'stdin' });

        expect(result).toEqual({ data: input });
      });

      it('should use "data" for null source', () => {
        const input = [{ id: 1 }];
        const result = normalizeJsonStructure(input, { source: null as any });

        expect(result).toEqual({ data: input });
      });

      it('should use "data" for undefined source', () => {
        const input = [{ id: 1 }];
        const result = normalizeJsonStructure(input, { source: undefined });

        expect(result).toEqual({ data: input });
      });

      describe('file path derivation', () => {
        it('should extract filename from absolute path', () => {
          const input = [{ id: 1 }];
          const result = normalizeJsonStructure(input, { source: '/path/to/users.json' });

          expect(result).toEqual({ users: input });
        });

        it('should extract filename from relative path', () => {
          const input = [{ id: 1 }];
          const result = normalizeJsonStructure(input, { source: './data/products.json' });

          expect(result).toEqual({ products: input });
        });

        it('should handle simple filename without path', () => {
          const input = [{ id: 1 }];
          const result = normalizeJsonStructure(input, { source: 'items.json' });

          expect(result).toEqual({ items: input });
        });

        it('should remove .json extension', () => {
          const input = [{ id: 1 }];
          const result = normalizeJsonStructure(input, { source: 'mydata.json' });

          expect(result).toEqual({ mydata: input });
        });

        it('should handle files with multiple extensions', () => {
          const input = [{ id: 1 }];
          const result = normalizeJsonStructure(input, { source: 'archive.tar.gz.json' });

          expect(result).toEqual({ archive_tar_gz: input });
        });

        it('should sanitize special characters in filename', () => {
          const input = [{ id: 1 }];
          const result = normalizeJsonStructure(input, { source: 'my-data-file.json' });

          expect(result).toEqual({ my_data_file: input });
        });
      });

      describe('URL path derivation', () => {
        it('should extract last path segment from URL', () => {
          const input = [{ id: 1 }];
          const result = normalizeJsonStructure(input, {
            source: 'https://example.com/api/users.json'
          });

          expect(result).toEqual({ users: input });
        });

        it('should handle URL without file extension', () => {
          const input = [{ id: 1 }];
          const result = normalizeJsonStructure(input, {
            source: 'https://api.example.com/data/items'
          });

          expect(result).toEqual({ items: input });
        });

        it('should fallback to "data" for URL with no path', () => {
          const input = [{ id: 1 }];
          const result = normalizeJsonStructure(input, {
            source: 'https://example.com/'
          });

          expect(result).toEqual({ data: input });
        });

        it('should handle HTTP URLs', () => {
          const input = [{ id: 1 }];
          const result = normalizeJsonStructure(input, {
            source: 'http://example.com/products.json'
          });

          expect(result).toEqual({ products: input });
        });

        it('should handle query parameters in URL', () => {
          const input = [{ id: 1 }];
          const result = normalizeJsonStructure(input, {
            source: 'https://api.example.com/items.json?key=value'
          });

          expect(result).toEqual({ items: input });
        });
      });
    });

    describe('edge cases', () => {
      it('should handle empty array', () => {
        const input: any[] = [];
        const result = normalizeJsonStructure(input);

        expect(result).toEqual({ data: input });
      });

      it('should handle array with null/undefined items', () => {
        const input = [null, undefined, { id: 1 }];
        const result = normalizeJsonStructure(input);

        expect(result).toEqual({ data: input });
      });

      it('should handle nested arrays (not unwrapped)', () => {
        const input = [[1, 2], [3, 4]];
        const result = normalizeJsonStructure(input);

        expect(result).toEqual({ data: input });
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
