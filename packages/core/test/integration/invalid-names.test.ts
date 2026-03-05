import { QueryOrchestrator } from '../../src/orchestrator';

describe('Invalid table names integration', () => {
  let orchestrator: QueryOrchestrator;

  beforeEach(() => {
    orchestrator = new QueryOrchestrator('sqlite');
  });

  afterEach(() => {
    orchestrator.close();
  });

  it('should handle JSON keys with hyphens', () => {
    const json = {
      'user-list': [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ]
    };

    orchestrator.loadJson(json);
    const result = orchestrator.executeQuery('SELECT * FROM user_list');
    
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0][3]).toBe('Alice'); // rows are arrays, not objects
  });

  it('should handle JSON keys with dots', () => {
    const json = {
      'api.users': [
        { id: 1, name: 'Alice' }
      ]
    };

    orchestrator.loadJson(json);
    const result = orchestrator.executeQuery('SELECT * FROM api_users');
    
    expect(result.rows).toHaveLength(1);
  });

  it('should handle JSON keys with special characters', () => {
    const json = {
      'users@2024': [
        { id: 1, name: 'Alice' }
      ],
      'data#main': [
        { id: 2, value: 'test' }
      ],
      'items(archived)': [
        { id: 3, status: 'old' }
      ]
    };

    orchestrator.loadJson(json);
    
    const result1 = orchestrator.executeQuery('SELECT * FROM users_2024');
    expect(result1.rows).toHaveLength(1);
    
    const result2 = orchestrator.executeQuery('SELECT * FROM data_main');
    expect(result2.rows).toHaveLength(1);
    
    const result3 = orchestrator.executeQuery('SELECT * FROM items_archived');
    expect(result3.rows).toHaveLength(1);
  });

  it('should handle JSON keys starting with numbers', () => {
    const json = {
      '2024users': [
        { id: 1, name: 'Alice' }
      ],
      '123data': [
        { id: 2, value: 'test' }
      ]
    };

    orchestrator.loadJson(json);
    
    const result1 = orchestrator.executeQuery('SELECT * FROM _2024users');
    expect(result1.rows).toHaveLength(1);
    
    const result2 = orchestrator.executeQuery('SELECT * FROM _123data');
    expect(result2.rows).toHaveLength(1);
  });

  it('should handle JSON keys with spaces', () => {
    const json = {
      'user list': [
        { id: 1, name: 'Alice' }
      ],
      'my data table': [
        { id: 2, value: 'test' }
      ]
    };

    orchestrator.loadJson(json);
    
    const result1 = orchestrator.executeQuery('SELECT * FROM user_list');
    expect(result1.rows).toHaveLength(1);
    
    const result2 = orchestrator.executeQuery('SELECT * FROM my_data_table');
    expect(result2.rows).toHaveLength(1);
  });

  it('should handle JSON keys with brackets and slashes', () => {
    const json = {
      'data[0]': [
        { id: 1, name: 'Alice' }
      ],
      'path/to/data': [
        { id: 2, value: 'test' }
      ]
    };

    orchestrator.loadJson(json);
    
    const result1 = orchestrator.executeQuery('SELECT * FROM data_0');
    expect(result1.rows).toHaveLength(1);
    
    const result2 = orchestrator.executeQuery('SELECT * FROM path_to_data');
    expect(result2.rows).toHaveLength(1);
  });

  it('should handle JSON keys with quotes', () => {
    const json = {
      '"users"': [
        { id: 1, name: 'Alice' }
      ],
      "'data'": [
        { id: 2, value: 'test' }
      ]
    };

    orchestrator.loadJson(json);
    
    const result1 = orchestrator.executeQuery('SELECT * FROM _users');
    expect(result1.rows).toHaveLength(1);
    
    const result2 = orchestrator.executeQuery('SELECT * FROM _data');
    expect(result2.rows).toHaveLength(1);
  });

  it('should handle mixed case keys', () => {
    const json = {
      'UserList': [
        { id: 1, name: 'Alice' }
      ],
      'MyDataTable': [
        { id: 2, value: 'test' }
      ]
    };

    orchestrator.loadJson(json);
    
    const result1 = orchestrator.executeQuery('SELECT * FROM userlist');
    expect(result1.rows).toHaveLength(1);
    
    const result2 = orchestrator.executeQuery('SELECT * FROM mydatatable');
    expect(result2.rows).toHaveLength(1);
  });

  it('should handle nested objects with invalid names', () => {
    const json = {
      'user-list': [
        {
          id: 1,
          name: 'Alice',
          'contact-info': {
            email: 'alice@example.com',
            'phone-number': '555-1234'
          }
        }
      ]
    };

    orchestrator.loadJson(json);
    
    const tables = orchestrator.listTables();
    expect(tables).toContain('user_list');
    expect(tables).toContain('user_list_contact_info');
    
    const result = orchestrator.executeQuery(
      'SELECT u.name, c.email FROM user_list u JOIN user_list_contact_info c ON u._id = c._pid'
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0][0]).toBe('Alice'); // rows are arrays: [name, email]
  });

  it('should handle empty or all-special-char keys', () => {
    const json = {
      '@#$%': [
        { id: 1, name: 'Alice' }
      ]
    };

    orchestrator.loadJson(json);
    
    const tables = orchestrator.listTables();
    expect(tables).toContain('table_data');
    
    const result = orchestrator.executeQuery('SELECT * FROM table_data');
    expect(result.rows).toHaveLength(1);
  });

  it('should handle complex real-world JSON with multiple invalid names', () => {
    const json = {
      'api/v1/users': [
        {
          id: 1,
          name: 'Alice',
          'meta-data': {
            'created-at': '2024-01-01',
            'updated@timestamp': '2024-01-02'
          }
        }
      ],
      '2024-orders': [
        { id: 101, total: 99.99 }
      ],
      'data(archived)': [
        { id: 201, status: 'old' }
      ]
    };

    orchestrator.loadJson(json);
    
    const tables = orchestrator.listTables();
    expect(tables).toContain('api_v1_users');
    expect(tables).toContain('api_v1_users_meta_data');
    expect(tables).toContain('_2024_orders');
    expect(tables).toContain('data_archived');
    
    const result = orchestrator.executeQuery('SELECT * FROM api_v1_users');
    expect(result.rows).toHaveLength(1);
  });
});
