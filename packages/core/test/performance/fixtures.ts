/**
 * Performance Test Fixture Generators
 */

export interface FixtureOptions {
  seed?: number;
}

/**
 * Generate a large JSON file with many objects
 * Target: ~50MB, 5000+ objects
 */
export function generateLargeFile(count: number = 5000, options: FixtureOptions = {}): any {
  const seed = options.seed ?? 42;
  const users: any[] = [];

  for (let i = 0; i < count; i++) {
    users.push({
      id: i + 1,
      username: `user_${i}_${seed}`,
      email: `user${i}@example${seed}.com`,
      firstName: `FirstName${i}`,
      lastName: `LastName${i}`,
      age: 18 + (i % 60),
      active: i % 2 === 0,
      balance: (i * 123.45) % 10000,
      registeredAt: new Date(2020 + (i % 5), (i % 12), 1 + (i % 28)).toISOString(),
      bio: `This is a biography for user ${i}. `.repeat(10), // ~300 chars
      tags: [`tag${i % 10}`, `category${i % 20}`, `type${i % 5}`],
      settings: {
        theme: i % 2 === 0 ? 'dark' : 'light',
        notifications: i % 3 === 0,
        language: ['en', 'es', 'fr', 'de'][i % 4],
      },
      metadata: {
        lastLogin: new Date(2024, 0, 1 + (i % 365)).toISOString(),
        loginCount: i * 3,
        ip: `192.168.${(i % 256)}.${((i * 7) % 256)}`,
      },
    });
  }

  return { users };
}

/**
 * Generate deeply nested object structure
 * Target: 20+ levels of nesting
 */
export function generateDeepNesting(depth: number = 25, options: FixtureOptions = {}): any {
  const seed = options.seed ?? 42;

  function createNestedLevel(level: number): any {
    if (level >= depth) {
      return {
        level,
        value: `leaf_${level}_${seed}`,
        data: ['item1', 'item2', 'item3'],
      };
    }

    return {
      level,
      name: `level_${level}`,
      value: `value_${level}_${seed}`,
      nested: createNestedLevel(level + 1),
      siblings: [
        {
          id: level * 100 + 1,
          name: `sibling_${level}_1`,
        },
        {
          id: level * 100 + 2,
          name: `sibling_${level}_2`,
        },
      ],
    };
  }

  return {
    root: [createNestedLevel(1)],
  };
}

/**
 * Generate JSON with dynamic/varying schemas
 * Includes: varying properties, optional fields, mixed types
 */
export function generateDynamicSchema(count: number = 1000, options: FixtureOptions = {}): any {
  const seed = options.seed ?? 42;
  const records: any[] = [];

  // Define different schema variations
  const schemaVariants = [
    // Variant 1: Basic user
    (i: number) => ({
      id: i,
      type: 'basic',
      name: `user_${i}_${seed}`,
      email: `user${i}@example.com`,
    }),
    // Variant 2: User with optional address
    (i: number) => ({
      id: i,
      type: 'with_address',
      name: `user_${i}_${seed}`,
      email: `user${i}@example.com`,
      address: i % 2 === 0 ? `${i} Main St` : null,
      city: i % 2 === 0 ? `City${i}` : undefined,
    }),
    // Variant 3: User with profile
    (i: number) => ({
      id: i,
      type: 'with_profile',
      name: `user_${i}_${seed}`,
      profile: {
        age: 20 + (i % 50),
        bio: `Bio for user ${i}`,
      },
    }),
    // Variant 4: User with varying number of properties
    (i: number) => {
      const obj: any = {
        id: i,
        type: 'variable_props',
        name: `user_${i}_${seed}`,
      };
      // Add varying number of dynamic properties
      for (let j = 0; j < (i % 10); j++) {
        obj[`prop_${j}`] = `value_${j}_${i}`;
      }
      return obj;
    },
    // Variant 5: Mixed types for same keys
    (i: number) => ({
      id: i,
      type: 'mixed_types',
      name: `user_${i}_${seed}`,
      flexField: i % 4 === 0 ? i : i % 4 === 1 ? `string_${i}` : i % 4 === 2 ? true : null,
      optionalField: i % 3 === 0 ? `present_${i}` : undefined,
    }),
    // Variant 6: Array vs single value
    (i: number) => ({
      id: i,
      type: 'array_variation',
      name: `user_${i}_${seed}`,
      tags: i % 2 === 0 ? [`tag${i}`, `tag${i + 1}`] : `single_tag_${i}`,
    }),
    // Variant 7: Deeply optional fields
    (i: number) => ({
      id: i,
      type: 'optional_heavy',
      name: `user_${i}_${seed}`,
      field1: i % 5 > 0 ? `val1_${i}` : undefined,
      field2: i % 5 > 1 ? `val2_${i}` : null,
      field3: i % 5 > 2 ? `val3_${i}` : undefined,
      field4: i % 5 > 3 ? `val4_${i}` : null,
    }),
    // Variant 8: Extra nested optional structure
    (i: number) => ({
      id: i,
      type: 'nested_optional',
      name: `user_${i}_${seed}`,
      details: i % 2 === 0 ? {
        nested1: `val_${i}`,
        nested2: i % 4 === 0 ? `deep_${i}` : undefined,
      } : undefined,
    }),
  ];

  for (let i = 0; i < count; i++) {
    const variantIndex = i % schemaVariants.length;
    records.push(schemaVariants[variantIndex](i));
  }

  return { records };
}

/**
 * Generate combined scenario: large + deep + dynamic
 */
export function generateCombinedScenario(options: FixtureOptions = {}): any {
  const seed = options.seed ?? 42;
  const items: any[] = [];

  // Generate 1000 items with varying complexity
  for (let i = 0; i < 1000; i++) {
    const item: any = {
      id: i,
      name: `item_${i}_${seed}`,
      type: ['typeA', 'typeB', 'typeC'][i % 3],
    };

    // Add optional fields (dynamic schema aspect)
    if (i % 2 === 0) {
      item.optionalField1 = `value_${i}`;
    }
    if (i % 3 === 0) {
      item.optionalField2 = i * 2;
    }

    // Add nested structure (moderate depth, ~10 levels)
    if (i % 5 === 0) {
      let nested: any = { level: 0, value: `root_${i}` };
      let current = nested;
      for (let depth = 1; depth < 10; depth++) {
        current.child = { level: depth, value: `level_${depth}_${i}` };
        current = current.child;
      }
      item.deepNested = nested;
    }

    // Add arrays with varying lengths
    item.tags = Array.from({ length: (i % 5) + 1 }, (_, idx) => `tag${idx}_${i}`);

    items.push(item);
  }

  return { items };
}

/**
 * Calculate approximate JSON size in bytes
 */
export function estimateJsonSize(obj: any): number {
  return JSON.stringify(obj).length;
}

/**
 * Calculate approximate JSON size in MB
 */
export function estimateJsonSizeMB(obj: any): number {
  return estimateJsonSize(obj) / 1024 / 1024;
}
