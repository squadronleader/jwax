import { coerceValue } from '../../src/transform/type-coercion';

describe('coerceValue', () => {
  describe('INTEGER', () => {
    it('should convert boolean to integer', () => {
      expect(coerceValue(true, 'INTEGER')).toBe(1);
      expect(coerceValue(false, 'INTEGER')).toBe(0);
    });

    it('should floor numbers', () => {
      expect(coerceValue(42, 'INTEGER')).toBe(42);
      expect(coerceValue(3.14, 'INTEGER')).toBe(3);
      expect(coerceValue(3.99, 'INTEGER')).toBe(3);
    });

    it('should parse strings', () => {
      expect(coerceValue('42', 'INTEGER')).toBe(42);
      expect(coerceValue('123', 'INTEGER')).toBe(123);
    });

    it('should return null for invalid strings', () => {
      expect(coerceValue('abc', 'INTEGER')).toBe(null);
      expect(coerceValue('', 'INTEGER')).toBe(null);
    });
  });

  describe('REAL', () => {
    it('should preserve numbers', () => {
      expect(coerceValue(3.14, 'REAL')).toBe(3.14);
      expect(coerceValue(42, 'REAL')).toBe(42);
    });

    it('should parse strings', () => {
      expect(coerceValue('3.14', 'REAL')).toBe(3.14);
      expect(coerceValue('42', 'REAL')).toBe(42);
    });

    it('should return null for invalid strings', () => {
      expect(coerceValue('abc', 'REAL')).toBe(null);
    });
  });

  describe('TEXT', () => {
    it('should preserve strings', () => {
      expect(coerceValue('hello', 'TEXT')).toBe('hello');
    });

    it('should stringify objects', () => {
      expect(coerceValue({ a: 1 }, 'TEXT')).toBe('{"a":1}');
      expect(coerceValue([1, 2, 3], 'TEXT')).toBe('[1,2,3]');
    });

    it('should convert numbers', () => {
      expect(coerceValue(42, 'TEXT')).toBe('42');
      expect(coerceValue(3.14, 'TEXT')).toBe('3.14');
    });
  });

  describe('NULL handling', () => {
    it('should return null for null values', () => {
      expect(coerceValue(null, 'INTEGER')).toBe(null);
      expect(coerceValue(null, 'REAL')).toBe(null);
      expect(coerceValue(null, 'TEXT')).toBe(null);
    });

    it('should return null for undefined values', () => {
      expect(coerceValue(undefined, 'INTEGER')).toBe(null);
      expect(coerceValue(undefined, 'REAL')).toBe(null);
      expect(coerceValue(undefined, 'TEXT')).toBe(null);
    });
  });

  describe('NULL type', () => {
    it('should always return null', () => {
      expect(coerceValue(42, 'NULL')).toBe(null);
      expect(coerceValue('test', 'NULL')).toBe(null);
      expect(coerceValue({}, 'NULL')).toBe(null);
    });
  });
});
