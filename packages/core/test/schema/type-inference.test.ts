import { inferType, inferColumnTypes } from '../../src/schema/type-inference';

describe('inferType', () => {
  it('should infer INTEGER for integers', () => {
    expect(inferType(42)).toBe('INTEGER');
    expect(inferType(0)).toBe('INTEGER');
    expect(inferType(-100)).toBe('INTEGER');
  });

  it('should infer REAL for floats', () => {
    expect(inferType(3.14)).toBe('REAL');
    expect(inferType(0.5)).toBe('REAL');
  });

  it('should infer TEXT for strings', () => {
    expect(inferType('hello')).toBe('TEXT');
    expect(inferType('')).toBe('TEXT');
  });

  it('should infer INTEGER for booleans', () => {
    expect(inferType(true)).toBe('INTEGER');
    expect(inferType(false)).toBe('INTEGER');
  });

  it('should infer NULL for null/undefined', () => {
    expect(inferType(null)).toBe('NULL');
    expect(inferType(undefined)).toBe('NULL');
  });

  it('should infer TEXT for objects', () => {
    expect(inferType({})).toBe('TEXT');
    expect(inferType({ a: 1 })).toBe('TEXT');
  });

  it('should infer TEXT for arrays', () => {
    expect(inferType([])).toBe('TEXT');
    expect(inferType([1, 2, 3])).toBe('TEXT');
  });
});

describe('inferColumnTypes', () => {
  it('should infer columns from simple objects', () => {
    const objects = [
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', age: 25 }
    ];

    const columns = inferColumnTypes(objects);

    expect(columns.size).toBe(3);
    expect(columns.get('id')?.type).toBe('INTEGER');
    expect(columns.get('name')?.type).toBe('TEXT');
    expect(columns.get('age')?.type).toBe('INTEGER');
  });

  it('should handle nullable columns', () => {
    const objects = [
      { id: 1, value: 'test' },
      { id: 2, value: null }
    ];

    const columns = inferColumnTypes(objects);

    expect(columns.get('value')?.nullable).toBe(true);
  });

  it('should make all columns nullable by default (lenient mode)', () => {
    const objects = [
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', age: 25 }
    ];

    const columns = inferColumnTypes(objects);

    expect(columns.get('id')?.nullable).toBe(true);
    expect(columns.get('name')?.nullable).toBe(true);
    expect(columns.get('age')?.nullable).toBe(true);
  });

  it('should mark non-null columns as NOT nullable in strict mode', () => {
    const objects = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ];

    const columns = inferColumnTypes(objects, { strictSchema: true });

    expect(columns.get('id')?.nullable).toBe(false);
    expect(columns.get('name')?.nullable).toBe(false);
  });

  it('should mark missing properties as nullable in strict mode', () => {
    const objects = [
      { id: 1, name: 'Alice', quota: 500 },
      { id: 2, name: 'Bob' } // quota missing
    ];

    const columns = inferColumnTypes(objects, { strictSchema: true });

    expect(columns.get('id')?.nullable).toBe(false);
    expect(columns.get('name')?.nullable).toBe(false);
    expect(columns.get('quota')?.nullable).toBe(true);
  });

  it('should handle missing properties', () => {
    const objects = [
      { id: 1, name: 'Alice' },
      { id: 2 } // name missing
    ];

    const columns = inferColumnTypes(objects);

    expect(columns.size).toBe(2);
    expect(columns.has('id')).toBe(true);
    expect(columns.has('name')).toBe(true);
  });

  it('should widen types when mixed', () => {
    const objects = [
      { value: 10 },      // INTEGER
      { value: 3.14 }     // REAL
    ];

    const columns = inferColumnTypes(objects);

    expect(columns.get('value')?.type).toBe('REAL'); // Widened to REAL
  });

  it('should widen to TEXT for string/number mix', () => {
    const objects = [
      { value: 10 },
      { value: 'text' }
    ];

    const columns = inferColumnTypes(objects);

    expect(columns.get('value')?.type).toBe('TEXT');
  });

  it('should skip nested objects', () => {
    const objects = [
      { id: 1, name: 'Alice', address: { city: 'NYC' } }
    ];

    const columns = inferColumnTypes(objects);

    expect(columns.size).toBe(2); // Only id and name
    expect(columns.has('address')).toBe(false);
  });

  it('should skip arrays', () => {
    const objects = [
      { id: 1, tags: ['a', 'b'] }
    ];

    const columns = inferColumnTypes(objects);

    expect(columns.size).toBe(1); // Only id
    expect(columns.has('tags')).toBe(false);
  });

  it('should handle empty array', () => {
    const columns = inferColumnTypes([]);
    expect(columns.size).toBe(0);
  });

  it('should sample only first N objects', () => {
    const objects = Array(200).fill(null).map((_, i) => ({ id: i }));
    
    const columns = inferColumnTypes(objects, 100);
    
    expect(columns.size).toBe(1);
    expect(columns.has('id')).toBe(true);
  });
});
