import { isJsonText } from '../src/json-validator';

describe('isJsonText', () => {
  describe('valid JSON starts', () => {
    it('should return true for text starting with {', () => {
      expect(isJsonText('{"key": "value"}')).toBe(true);
    });

    it('should return true for text starting with [', () => {
      expect(isJsonText('[1, 2, 3]')).toBe(true);
    });

    it('should return true for minimal object', () => {
      expect(isJsonText('{}')).toBe(true);
    });

    it('should return true for minimal array', () => {
      expect(isJsonText('[]')).toBe(true);
    });

    it('should return true for text with leading whitespace then {', () => {
      expect(isJsonText('   \n\t {"key": "value"}')).toBe(true);
    });

    it('should return true for text with leading whitespace then [', () => {
      expect(isJsonText('  \n  [{"id": 1}]')).toBe(true);
    });

    it('should return true for large whitespace prefix', () => {
      const largeWhitespace = '\n\n\n\n\n\t\t\t  ';
      expect(isJsonText(`${largeWhitespace}[1, 2, 3]`)).toBe(true);
    });
  });

  describe('invalid JSON starts', () => {
    it('should return false for text starting with non-JSON character', () => {
      expect(isJsonText('function test() {}')).toBe(false);
    });

    it('should return false for text starting with number', () => {
      expect(isJsonText('12345')).toBe(false);
    });

    it('should return false for text starting with string', () => {
      expect(isJsonText('"just a string"')).toBe(false);
    });

    it('should return false for text starting with invalid JSON character', () => {
      expect(isJsonText('const x = {"unclosed": ')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false for empty string', () => {
      expect(isJsonText('')).toBe(false);
    });

    it('should return false for whitespace-only string', () => {
      expect(isJsonText('   \n\t  ')).toBe(false);
    });

    it('should handle non-string-like inputs gracefully', () => {
      // Even if something weird happens, should not throw
      expect(() => isJsonText(null as any)).not.toThrow();
      expect(() => isJsonText(undefined as any)).not.toThrow();
    });
  });

  describe('realistic patterns', () => {
    it('should handle JSON objects with nested content', () => {
      expect(isJsonText('{"users": [{"id": 1, "name": "Alice"}]}')).toBe(true);
    });

    it('should handle array of objects', () => {
      expect(isJsonText('[{"id": 1}, {"id": 2}]')).toBe(true);
    });

    it('should reject JavaScript code', () => {
      expect(isJsonText('const data = {"key": "value"};')).toBe(false);
    });

    it('should reject HTML', () => {
      expect(isJsonText('<html><body>{"data": 1}</body></html>')).toBe(false);
    });

    it('should reject YAML', () => {
      expect(isJsonText('key: value\nother: 123')).toBe(false);
    });

    it('should reject comments before JSON', () => {
      expect(isJsonText('// comment\n{"key": "value"}')).toBe(false);
    });
  });
});
