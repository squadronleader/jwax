import {
  parseJsonText,
  createLoadedOrchestrator,
  formatResultsAsTable,
  formatTableList,
  formatSchema,
} from '../src/helpers';

describe('parseJsonText', () => {
  it('should parse valid JSON', () => {
    const result = parseJsonText('{"users": [{"id": 1}]}');
    expect(result).toEqual({ users: [{ id: 1 }] });
  });

  it('should parse valid JSON arrays', () => {
    const result = parseJsonText('[1, 2, 3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('should throw on invalid JSON', () => {
    expect(() => parseJsonText('not json')).toThrow('The active file does not contain valid JSON.');
  });

  it('should throw on empty string', () => {
    expect(() => parseJsonText('')).toThrow('The active file does not contain valid JSON.');
  });

  it('should handle JSON with whitespace', () => {
    const result = parseJsonText('  { "key": "value" }  ');
    expect(result).toEqual({ key: 'value' });
  });
});

describe('createLoadedOrchestrator', () => {
  it('should create an orchestrator and load JSON data', async () => {
    const data = { users: [{ id: 1, name: 'Alice' }] };
    const orchestrator = await createLoadedOrchestrator(data);

    try {
      const tables = orchestrator.listTables();
      expect(tables).toContain('users');
    } finally {
      orchestrator.close();
    }
  });

  it('should handle nested objects', async () => {
    const data = {
      users: [{ id: 1, address: { city: 'NYC' } }],
    };
    const orchestrator = await createLoadedOrchestrator(data);

    try {
      const tables = orchestrator.listTables();
      expect(tables).toContain('users');
      expect(tables).toContain('users_address');
    } finally {
      orchestrator.close();
    }
  });

  it('should handle multiple top-level arrays', async () => {
    const data = {
      users: [{ id: 1 }],
      orders: [{ id: 100, total: 50 }],
    };
    const orchestrator = await createLoadedOrchestrator(data);

    try {
      const tables = orchestrator.listTables();
      expect(tables).toContain('users');
      expect(tables).toContain('orders');
    } finally {
      orchestrator.close();
    }
  });

  it('should handle root array (normalize to object)', async () => {
    const data = [
      { id: 1, name: 'Alice', address: { city: 'NYC' } },
      { id: 2, name: 'Bob', address: { city: 'LA' } },
    ];
    const orchestrator = await createLoadedOrchestrator(data);

    try {
      const tables = orchestrator.listTables();
      // Root array should be wrapped as 'root' table
      expect(tables).toContain('root');
      // Nested objects should still create related tables
      expect(tables).toContain('root_address');
      
      // Verify we can query it
      const result = orchestrator.executeQuery('SELECT COUNT(*) as cnt FROM root');
      expect(result.rows[0][0]).toBe(2);
    } finally {
      orchestrator.close();
    }
  });
});

describe('formatResultsAsTable', () => {
  it('should return message for empty results', () => {
    expect(formatResultsAsTable({ headers: [], rows: [] })).toBe('Query returned no results.');
  });

  it('should format single row', () => {
    const result = { headers: ['id', 'name'], rows: [[1, 'Alice']] };
    const output = formatResultsAsTable(result);

    expect(output).toContain('id');
    expect(output).toContain('name');
    expect(output).toContain('1');
    expect(output).toContain('Alice');
  });

  it('should format multiple rows', () => {
    const result = {
      headers: ['id', 'name'],
      rows: [[1, 'Alice'], [2, 'Bob']],
    };
    const output = formatResultsAsTable(result);

    expect(output).toContain('Alice');
    expect(output).toContain('Bob');
  });

  it('should handle null values', () => {
    const result = { headers: ['id', 'name'], rows: [[1, null]] };
    const output = formatResultsAsTable(result);

    expect(output).toContain('id');
    expect(output).toContain('name');
  });

  it('should pad columns to align', () => {
    const result = {
      headers: ['id', 'name'],
      rows: [[1, 'A'], [2, 'LongName']],
    };
    const output = formatResultsAsTable(result);
    const lines = output.split('\n');
    // All data lines should be the same length
    const dataLines = lines.filter(l => l.startsWith('|'));
    const lengths = dataLines.map(l => l.length);
    expect(new Set(lengths).size).toBe(1);
  });

  it('should not include nested object columns', async () => {
    const data = {
      company: [{ id: 1, name: 'Acme', address: { city: 'NYC' } }],
    };
    const orchestrator = await createLoadedOrchestrator(data);
    try {
      const result = orchestrator.executeQuery('SELECT * FROM company');
      const output = formatResultsAsTable(result);
      expect(output).toContain('id');
      expect(output).toContain('name');
      expect(output).not.toContain('[object Object]');
      expect(output).not.toContain('address');
    } finally {
      orchestrator.close();
    }
  });
});

describe('formatTableList', () => {
  it('should return message for empty list', () => {
    expect(formatTableList([])).toBe('No tables found in the JSON data.');
  });

  it('should format single table', () => {
    const output = formatTableList(['users']);
    expect(output).toContain('Found 1 table(s)');
    expect(output).toContain('• users');
  });

  it('should format multiple tables', () => {
    const output = formatTableList(['users', 'orders', 'products']);
    expect(output).toContain('Found 3 table(s)');
    expect(output).toContain('• users');
    expect(output).toContain('• orders');
    expect(output).toContain('• products');
  });
});

describe('formatSchema', () => {
  it('should return message for null schema', () => {
    expect(formatSchema(null)).toBe('No schema found.');
  });

  it('should return message for empty schema', () => {
    const schema = { tables: new Map(), rootTables: [] };
    expect(formatSchema(schema)).toBe('No schema found.');
  });

  it('should format single table schema', () => {
    const schema: any = {
      tables: new Map([
        ['users', {
          name: 'users',
          path: ['users'],
          originalPath: ['users'],
          columns: [
            { name: '_id', type: 'TEXT' },
            { name: 'id', type: 'INTEGER' },
            { name: 'name', type: 'TEXT' },
          ],
          primaryKey: '_id',
        }],
      ]),
      rootTables: ['users'],
    };
    const output = formatSchema(schema);

    expect(output).toContain('Table: users');
    expect(output).toContain('_id');
    expect(output).toContain('INTEGER');
    expect(output).toContain('name');
  });

  it('should format multiple table schemas', () => {
    const schema: any = {
      tables: new Map([
        ['users', {
          name: 'users',
          path: ['users'],
          originalPath: ['users'],
          columns: [{ name: 'id', type: 'INTEGER' }],
          primaryKey: '_id',
        }],
        ['orders', {
          name: 'orders',
          path: ['orders'],
          originalPath: ['orders'],
          columns: [{ name: 'total', type: 'REAL' }],
          primaryKey: '_id',
        }],
      ]),
      rootTables: ['users', 'orders'],
    };
    const output = formatSchema(schema);

    expect(output).toContain('Table: users');
    expect(output).toContain('Table: orders');
    expect(output).toContain('REAL');
  });
});
