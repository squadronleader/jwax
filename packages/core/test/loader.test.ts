import { isUrl, loadJson } from '../src/loader';
import * as fs from 'fs';
import * as path from 'path';

describe('loader', () => {
  const tempDir = path.join(__dirname, '../temp');

  beforeAll(() => {
    // Create temp directory for test files
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('isUrl', () => {
    it('should detect HTTP URLs', () => {
      expect(isUrl('http://example.com')).toBe(true);
    });

    it('should detect HTTPS URLs', () => {
      expect(isUrl('https://example.com')).toBe(true);
    });

    it('should reject file paths', () => {
      expect(isUrl('/path/to/file.json')).toBe(false);
      expect(isUrl('./relative/path.json')).toBe(false);
      expect(isUrl('file.json')).toBe(false);
    });
  });

  describe('loadJson', () => {
    it('should load JSON from file path', async () => {
      const testFile = path.join(__dirname, 'fixtures/simple.json');
      const json = await loadJson(testFile);
      
      expect(json).toBeDefined();
      expect(json.users).toBeDefined();
      expect(Array.isArray(json.users)).toBe(true);
    });

    it('should throw error for non-existent file', async () => {
      await expect(loadJson('/non/existent/file.json')).rejects.toThrow();
    });

    it('should throw error for invalid JSON file', async () => {
      const invalidFile = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(invalidFile, '{invalid json}');
      
      await expect(loadJson(invalidFile)).rejects.toThrow();
      
      fs.unlinkSync(invalidFile);
    });

    describe('direct array support', () => {
      it('should wrap direct array from file with table name from filename', async () => {
        const testFile = path.join(tempDir, 'users.json');
        const arrayData = [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ];
        fs.writeFileSync(testFile, JSON.stringify(arrayData));

        const json = await loadJson(testFile);

        expect(json).toBeDefined();
        expect(json.users).toBeDefined();
        expect(Array.isArray(json.users)).toBe(true);
        expect(json.users).toHaveLength(2);
        expect(json.users[0].name).toBe('Alice');
      });

      it('should sanitize table names with hyphens', async () => {
        const testFile = path.join(tempDir, 'test-data.json');
        const arrayData = [{ id: 1 }];
        fs.writeFileSync(testFile, JSON.stringify(arrayData));

        const json = await loadJson(testFile);

        expect(json).toBeDefined();
        expect(json.test_data).toBeDefined();
        expect(Array.isArray(json.test_data)).toBe(true);
      });

      it('should sanitize table names with special characters', async () => {
        const testFile = path.join(tempDir, 'my@data#file.json');
        const arrayData = [{ id: 1 }];
        fs.writeFileSync(testFile, JSON.stringify(arrayData));

        const json = await loadJson(testFile);

        expect(json).toBeDefined();
        expect(json.my_data_file).toBeDefined();
        expect(Array.isArray(json.my_data_file)).toBe(true);
      });

      it('should prefix table names starting with numbers', async () => {
        const testFile = path.join(tempDir, '123data.json');
        const arrayData = [{ id: 1 }];
        fs.writeFileSync(testFile, JSON.stringify(arrayData));

        const json = await loadJson(testFile);

        expect(json).toBeDefined();
        expect(json.t_123data).toBeDefined();
        expect(Array.isArray(json.t_123data)).toBe(true);
      });

      it('should use "data" as fallback for empty filename', async () => {
        const testFile = path.join(tempDir, '.json');
        const arrayData = [{ id: 1 }];
        fs.writeFileSync(testFile, JSON.stringify(arrayData));

        const json = await loadJson(testFile);

        expect(json).toBeDefined();
        expect(json.data).toBeDefined();
        expect(Array.isArray(json.data)).toBe(true);
      });

      it('should not wrap object-based JSON', async () => {
        const testFile = path.join(tempDir, 'object-data.json');
        const objectData = {
          users: [{ id: 1, name: 'Alice' }],
          orders: [{ id: 101, total: 99.99 }]
        };
        fs.writeFileSync(testFile, JSON.stringify(objectData));

        const json = await loadJson(testFile);

        expect(json).toBeDefined();
        expect(json.users).toBeDefined();
        expect(json.orders).toBeDefined();
        expect(Array.isArray(json.users)).toBe(true);
        expect(Array.isArray(json.orders)).toBe(true);
      });
    });

    // Note: URL loading tests would require mocking HTTP requests or using a test server
    // For now, these are integration tests that can be run manually
  });
});
