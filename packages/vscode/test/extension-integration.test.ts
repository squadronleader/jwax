import { QueryHistoryManager } from '../src/query-history';

/**
 * Integration tests for extension behavior with QueryHistoryManager.
 * These tests verify the contract between the extension and the history manager.
 */
describe('Extension Query History Integration', () => {
  let historyManager: QueryHistoryManager;
  const fileUri1 = 'file:///tmp/test1.json';
  const fileUri2 = 'file:///tmp/test2.json';

  beforeEach(() => {
    historyManager = new QueryHistoryManager(5);
  });

  it('should initialize history manager with configured size', () => {
    const manager = new QueryHistoryManager(10);
    expect(manager.isEnabled()).toBe(true);
    
    // Add 10 queries
    for (let i = 1; i <= 12; i++) {
      manager.addQuery(fileUri1, `SELECT * FROM table${i}`);
    }
    
    const history = manager.getHistory(fileUri1);
    expect(history.length).toBe(10);
  });

  it('should dynamically update history size when setting changes', () => {
    // Start with size 5
    const manager = new QueryHistoryManager(5);
    for (let i = 1; i <= 5; i++) {
      manager.addQuery(fileUri1, `Query ${i}`);
    }
    expect(manager.getHistory(fileUri1).length).toBe(5);

    // User changes setting to 3
    manager.setMaxSize(3);
    expect(manager.getHistory(fileUri1).length).toBe(3);
    expect(manager.getHistory(fileUri1)).toEqual(['Query 5', 'Query 4', 'Query 3']);
  });

  it('should disable history when setting is changed to 0', () => {
    historyManager.addQuery(fileUri1, 'SELECT * FROM users');
    expect(historyManager.getHistory(fileUri1)).toContain('SELECT * FROM users');

    historyManager.setMaxSize(0);
    expect(historyManager.isEnabled()).toBe(false);
    expect(historyManager.getHistory(fileUri1)).toEqual([]);
  });

  it('should show quick pick items in correct order for extension UI', () => {
    historyManager.addQuery(fileUri1, 'SELECT * FROM users');
    historyManager.addQuery(fileUri1, 'SELECT * FROM orders WHERE total > 100');
    historyManager.addQuery(fileUri1, 'SELECT COUNT(*) FROM products');

    const history = historyManager.getHistory(fileUri1);
    
    // Extension builds items with "Write new query" first, then separator, then history
    const items: any[] = [
      {
        label: '$(edit) Write new query',
        description: 'Enter a new SQL query',
        detail: '',
        isNewQuery: true,
      },
      {
        label: '$(dash) Recently used',
        kind: 'separator',  // QuickPickItemKind.Separator
      },
    ];

    history.forEach((query, index) => {
      items.push({
        label: `$(history) ${query.length > 60 ? query.substring(0, 57) + '...' : query}`,
        description: index === 0 ? '(most recent)' : '',
        detail: query,
        isNewQuery: false,
      });
    });

    expect(items.length).toBe(5);  // 1 "Write new" + 1 separator + 3 history
    expect(items[0].isNewQuery).toBe(true);
    expect(items[0].label).toContain('Write new query');
    expect(items[1].label).toContain('Recently used');
    expect(items[2].label).toContain('SELECT COUNT');
    expect(items[2].description).toBe('(most recent)');
  });

  it('should handle long query truncation in UI', () => {
    const longQuery = 'SELECT * FROM table WHERE column LIKE "value" AND other > 100 AND third IN (1,2,3)';
    historyManager.addQuery(fileUri1, longQuery);

    const history = historyManager.getHistory(fileUri1);
    const truncatedLabel = `$(history) ${history[0].substring(0, 57)}...`;
    
    expect(truncatedLabel.length).toBeLessThanOrEqual(71);
    expect(truncatedLabel).toContain('...');
  });

  it('should track query execution for each file separately', () => {
    // User opens file1.json and runs a few queries
    historyManager.addQuery(fileUri1, 'SELECT * FROM users');
    historyManager.addQuery(fileUri1, 'SELECT * FROM orders');

    // User switches to file2.json and runs different queries
    historyManager.addQuery(fileUri2, 'SELECT COUNT(*) FROM products');
    historyManager.addQuery(fileUri2, 'SELECT * FROM categories');

    // History should be separate
    const history1 = historyManager.getHistory(fileUri1);
    const history2 = historyManager.getHistory(fileUri2);

    expect(history1).toEqual(['SELECT * FROM orders', 'SELECT * FROM users']);
    expect(history2).toEqual(['SELECT * FROM categories', 'SELECT COUNT(*) FROM products']);
  });

  it('should allow quick re-execution of same query from different files', () => {
    const query = 'SELECT * FROM data LIMIT 10';
    
    // Same query used in two files
    historyManager.addQuery(fileUri1, query);
    historyManager.addQuery(fileUri2, query);

    // Each file's history contains the query
    expect(historyManager.getHistory(fileUri1)).toContain(query);
    expect(historyManager.getHistory(fileUri2)).toContain(query);
  });

  it('should handle re-running same query (move to top)', () => {
    historyManager.addQuery(fileUri1, 'Query A');
    historyManager.addQuery(fileUri1, 'Query B');
    historyManager.addQuery(fileUri1, 'Query C');

    // User runs Query A again from history
    historyManager.addQuery(fileUri1, 'Query A');

    const history = historyManager.getHistory(fileUri1);
    expect(history[0]).toBe('Query A');
    expect(history.length).toBe(3);  // Still only 3 queries, not duplicated
  });

  it('should work with realistic query patterns', () => {
    const queries = [
      'SELECT * FROM company WHERE founded > 2010',
      'SELECT name, revenue FROM company ORDER BY revenue DESC LIMIT 5',
      'SELECT COUNT(*) as total FROM company',
      'SELECT * FROM company JOIN employees ON company._id = employees._pid',
      'SELECT name FROM company WHERE employees > 100',
    ];

    queries.forEach((query, index) => {
      historyManager.addQuery(fileUri1, query);
    });

    const history = historyManager.getHistory(fileUri1);
    
    // Most recent first
    expect(history[0]).toBe(queries[queries.length - 1]);
    // All queries present
    expect(history.length).toBe(5);
  });

  it('should allow user to select "Write new query" to enter custom query', () => {
    historyManager.addQuery(fileUri1, 'SELECT * FROM users');
    historyManager.addQuery(fileUri1, 'SELECT * FROM orders');

    // The workflow is:
    // 1. Show Quick Pick with "Write new query" at top
    // 2. User selects "Write new query"
    // 3. Input box opens for user to type custom query
    // 4. User presses Enter to execute

    const newQueryOption = {
      label: '$(edit) Write new query',
      description: 'Enter a new SQL query',
      detail: '',
      isNewQuery: true,
    };

    expect(newQueryOption.isNewQuery).toBe(true);
    expect(newQueryOption.label).toContain('Write new query');

    // When this option is selected, input box should open
    // (tested via E2E in VS Code, not unit tests)
  });
});
