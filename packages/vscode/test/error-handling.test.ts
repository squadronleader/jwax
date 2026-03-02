import { parseSQLError } from '../src/error-parser';

describe('parseSQLError', () => {
  describe('table not found errors', () => {
    it('should detect "no such table" error', () => {
      const error = new Error('no such table: users');
      const result = parseSQLError(error);

      expect(result.isTableNotFound).toBe(true);
      expect(result.message).toBe('no such table: users');
      expect(result.tableName).toBe('users');
    });

    it('should detect table not found with different table names', () => {
      const error = new Error('no such table: products_catalog');
      const result = parseSQLError(error);

      expect(result.isTableNotFound).toBe(true);
      expect(result.tableName).toBe('products_catalog');
    });

    it('should handle case-insensitive matching', () => {
      const error = new Error('NO SUCH TABLE: test_table');
      const result = parseSQLError(error);

      expect(result.isTableNotFound).toBe(true);
      expect(result.tableName).toBe('test_table');
    });

    it('should handle extra whitespace', () => {
      const error = new Error('no such table:  myTable');
      const result = parseSQLError(error);

      expect(result.isTableNotFound).toBe(true);
      expect(result.tableName).toBe('myTable');
    });
  });

  describe('other SQL errors', () => {
    it('should not flag syntax errors as table not found', () => {
      const error = new Error('near "SELEKT": syntax error');
      const result = parseSQLError(error);

      expect(result.isTableNotFound).toBe(false);
      expect(result.message).toBe('near "SELEKT": syntax error');
      expect(result.tableName).toBeUndefined();
    });

    it('should not flag column errors as table not found', () => {
      const error = new Error('no such column: missing_col');
      const result = parseSQLError(error);

      expect(result.isTableNotFound).toBe(false);
      expect(result.message).toBe('no such column: missing_col');
    });

    it('should not flag constraint errors as table not found', () => {
      const error = new Error('UNIQUE constraint failed: id');
      const result = parseSQLError(error);

      expect(result.isTableNotFound).toBe(false);
      expect(result.message).toBe('UNIQUE constraint failed: id');
    });

    it('should handle empty error messages', () => {
      const error = new Error('');
      const result = parseSQLError(error);

      expect(result.isTableNotFound).toBe(false);
      expect(result.message).toBe('Error');
    });

    it('should handle null error message', () => {
      const error = { message: null };
      const result = parseSQLError(error);

      expect(result.isTableNotFound).toBe(false);
      expect(result.message).toBe('[object Object]');
    });

    it('should handle non-Error objects', () => {
      const result = parseSQLError({ custom: 'error' });

      expect(result.isTableNotFound).toBe(false);
      expect(result.message).toBe('[object Object]');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in table names', () => {
      const error = new Error('no such table: my_table_123');
      const result = parseSQLError(error);

      expect(result.isTableNotFound).toBe(true);
      expect(result.tableName).toBe('my_table_123');
    });

    it('should handle table names that look like numbers', () => {
      const error = new Error('no such table: 2024_data');
      const result = parseSQLError(error);

      expect(result.isTableNotFound).toBe(true);
      expect(result.tableName).toBe('2024_data');
    });

    it('should preserve full error message', () => {
      const fullMessage = 'SQL Error: no such table: users';
      const error = new Error(fullMessage);
      const result = parseSQLError(error);

      expect(result.message).toBe(fullMessage);
    });
  });
});
