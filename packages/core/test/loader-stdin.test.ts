import { isStdin, loadJson } from '../src/loader';
import * as fs from 'fs';

describe('Stdin Detection', () => {
  describe('isStdin', () => {
    it('should return true for "-"', () => {
      expect(isStdin('-')).toBe(true);
    });

    it('should return true for null', () => {
      expect(isStdin(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isStdin(undefined)).toBe(true);
    });

    it('should return false for file path', () => {
      expect(isStdin('/path/to/file.json')).toBe(false);
    });

    it('should return false for URL', () => {
      expect(isStdin('http://example.com/data.json')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isStdin('')).toBe(false);
    });
  });

  describe('Table naming with override', () => {
    it('should use tableName override for file', async () => {
      const tmpFile = '/tmp/test-jwax-tablename.json';
      fs.writeFileSync(tmpFile, JSON.stringify([{ id: 1 }]));
      
      const result = await loadJson(tmpFile, { tableName: 'custom_table' });
      
      expect(result).toEqual({
        custom_table: [{ id: 1 }]
      });
      
      fs.unlinkSync(tmpFile);
    });

    it('should use tableName override for array', async () => {
      const tmpFile = '/tmp/test-jwax-override.json';
      fs.writeFileSync(tmpFile, JSON.stringify([{ id: 1, name: 'test' }]));
      
      const result = await loadJson(tmpFile, { tableName: 'my_table' });
      
      expect(result).toEqual({
        my_table: [{ id: 1, name: 'test' }]
      });
      
      fs.unlinkSync(tmpFile);
    });

    it('should use "root" as default table name when no override', async () => {
      const tmpFile = '/tmp/products.json';
      fs.writeFileSync(tmpFile, JSON.stringify([{ id: 1 }]));
      
      const result = await loadJson(tmpFile);
      
      expect(result).toEqual({
        root: [{ id: 1 }]
      });
      
      fs.unlinkSync(tmpFile);
    });

    it('should sanitize table name from override', async () => {
      const tmpFile = '/tmp/test.json';
      fs.writeFileSync(tmpFile, JSON.stringify([{ id: 1 }]));
      
      const result = await loadJson(tmpFile, { tableName: 'my-table-name!' });
      
      expect(result).toEqual({
        my_table_name_: [{ id: 1 }]
      });
      
      fs.unlinkSync(tmpFile);
    });

    it('should prepend t_ if override starts with number', async () => {
      const tmpFile = '/tmp/test.json';
      fs.writeFileSync(tmpFile, JSON.stringify([{ id: 1 }]));
      
      const result = await loadJson(tmpFile, { tableName: '123table' });
      
      expect(result).toEqual({
        't_123table': [{ id: 1 }]
      });
      
      fs.unlinkSync(tmpFile);
    });

    it('should not wrap objects in table when override is provided', async () => {
      const tmpFile = '/tmp/test.json';
      fs.writeFileSync(tmpFile, JSON.stringify({ users: [{ id: 1 }] }));
      
      const result = await loadJson(tmpFile, { tableName: 'ignored' });
      
      // tableName only applies to top-level arrays
      expect(result).toEqual({
        users: [{ id: 1 }]
      });
      
      fs.unlinkSync(tmpFile);
    });
  });
});
