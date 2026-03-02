import { IDGenerator } from '../../src/transform/id-generator';

describe('IDGenerator', () => {
  let generator: IDGenerator;

  beforeEach(() => {
    generator = new IDGenerator();
  });

  it('should generate sequential IDs starting from 1', () => {
    expect(generator.nextId('users')).toBe(1);
    expect(generator.nextId('users')).toBe(2);
    expect(generator.nextId('users')).toBe(3);
  });

  it('should maintain separate counters per table', () => {
    expect(generator.nextId('users')).toBe(1);
    expect(generator.nextId('orders')).toBe(1);
    expect(generator.nextId('users')).toBe(2);
    expect(generator.nextId('orders')).toBe(2);
  });

  it('should return current count', () => {
    generator.nextId('users');
    generator.nextId('users');
    
    expect(generator.getCount('users')).toBe(2);
    expect(generator.getCount('orders')).toBe(0);
  });

  it('should reset all counters', () => {
    generator.nextId('users');
    generator.nextId('orders');
    
    generator.reset();
    
    expect(generator.getCount('users')).toBe(0);
    expect(generator.getCount('orders')).toBe(0);
    expect(generator.nextId('users')).toBe(1);
  });
});
