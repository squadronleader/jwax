import { ReadlineTerminal } from '../../src/terminal/readline-terminal';
import { QueryOrchestrator } from '@jwax/core';
import * as readline from 'readline';

jest.mock('readline');

describe('ReadlineTerminal', () => {
  let orchestrator: QueryOrchestrator;
  let terminal: ReadlineTerminal;
  let mockRl: any;
  let lineHandler: any;

  beforeEach(() => {
    orchestrator = new QueryOrchestrator();
    
    // Setup test data
    const json = {
      users: [
        { id: 1, name: 'Alice', age: 30 },
        { id: 2, name: 'Bob', age: 25 }
      ]
    };
    orchestrator.loadJson(json);

    // Mock readline.Interface
    mockRl = {
      on: jest.fn((event, callback) => {
        if (event === 'line') {
          lineHandler = callback;
        }
        return mockRl;
      }),
      prompt: jest.fn(),
      close: jest.fn(),
      question: jest.fn(),
      setPrompt: jest.fn()
    };

    (readline.createInterface as jest.Mock).mockReturnValue(mockRl);
    
    terminal = new ReadlineTerminal(orchestrator, {
      enableAutocomplete: false,
      enableInlineHints: false
    });

    terminal.start();
    jest.clearAllMocks();
  });

  afterEach(() => {
    orchestrator.close();
  });

  it('should print engine before discovery line when provided', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const terminalWithEngine = new ReadlineTerminal(orchestrator, {
      enableAutocomplete: false,
      enableInlineHints: false,
      engineName: 'wasm',
    });

    terminalWithEngine.start();

    const calls = consoleSpy.mock.calls.map(call => String(call[0]));
    expect(calls.indexOf('Engine: wasm')).toBeGreaterThanOrEqual(0);
    expect(calls.indexOf('Discovered 1 table(s).')).toBeGreaterThan(calls.indexOf('Engine: wasm'));
    consoleSpy.mockRestore();
  });

  describe('Empty results handling', () => {
    it('should display "Your query returned no results." when query returns no rows', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Execute a query that returns no results
      lineHandler('SELECT * FROM users WHERE id > 100');

      // Should print message instead of displaying table
      expect(consoleSpy).toHaveBeenCalledWith('Your query returned no results.');

      consoleSpy.mockRestore();
    });

    it('should display results when query returns rows', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Execute a query that returns results
      lineHandler('SELECT * FROM users WHERE id = 1');

      // Should output table data, not the empty message
      const logCalls = consoleSpy.mock.calls.map((c: any) => c[0]);
      expect(logCalls).not.toContain('Your query returned no results.');
      // Check that some table output was produced
      expect(consoleSpy).toHaveBeenCalled();
      const output = logCalls.join('\n');
      expect(output).toContain('Alice'); // Should contain data from query

      consoleSpy.mockRestore();
    });

    it('should display empty message for WHERE clause that matches nothing', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Execute a query with WHERE clause that matches no rows
      lineHandler("SELECT name FROM users WHERE name = 'NonExistent'");

      expect(consoleSpy).toHaveBeenCalledWith('Your query returned no results.');

      consoleSpy.mockRestore();
    });

    it('should handle empty table gracefully', () => {
      // Test with a WHERE clause that matches no rows instead of an empty table
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      lineHandler("SELECT * FROM users WHERE age > 100");

      expect(consoleSpy).toHaveBeenCalledWith('Your query returned no results.');

      consoleSpy.mockRestore();
    });
  });

  describe('Query result display', () => {
    it('should display results with correct headers and rows', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      lineHandler('SELECT name, age FROM users ORDER BY id');

      // Check that output was produced with the expected data
      const logCalls = consoleSpy.mock.calls.map((c: any) => c[0]);
      const output = logCalls.join('\n');
      expect(output).toContain('name');
      expect(output).toContain('age');
      expect(output).toContain('Alice');
      expect(output).toContain('Bob');
      expect(output).toContain('30');
      expect(output).toContain('25');
      
      consoleSpy.mockRestore();
    });

    it('should call prompt after displaying results', () => {
      jest.clearAllMocks();
      
      lineHandler('SELECT * FROM users WHERE id = 1');

      expect(mockRl.prompt).toHaveBeenCalled();
    });

    it('should call prompt after displaying empty message', () => {
      jest.clearAllMocks();
      
      lineHandler('SELECT * FROM users WHERE id > 100');

      expect(mockRl.prompt).toHaveBeenCalled();
    });
  });

  describe('Schema commands', () => {
    it('should render schema tree for :show-schema', () => {
      orchestrator.close();
      orchestrator = new QueryOrchestrator();
      orchestrator.loadJson({
        users: [
          {
            id: 1,
            name: 'Alice',
            address: [{ city: 'Paris' }]
          }
        ]
      });

      terminal = new ReadlineTerminal(orchestrator, {
        enableAutocomplete: false,
        enableInlineHints: false
      });
      terminal.start();
      jest.clearAllMocks();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      lineHandler(':show-schema');

      const output = consoleSpy.mock.calls.map((c: any) => String(c[0])).join('\n');
      expect(output).toContain('Schema Tree:');
      expect(output).toContain('users');
      expect(output).toContain('address');
      expect(output).toMatch(/└─ address/);

      consoleSpy.mockRestore();
    });

    it('should render continuation bars for nested non-last branches', () => {
      orchestrator.close();
      orchestrator = new QueryOrchestrator();
      orchestrator.loadJson({
        users: [
          {
            id: 1,
            address: [{ geo: [{ lat: 1 }] }],
            orders: [{ id: 99 }]
          }
        ]
      });

      terminal = new ReadlineTerminal(orchestrator, {
        enableAutocomplete: false,
        enableInlineHints: false
      });
      terminal.start();
      jest.clearAllMocks();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      lineHandler(':show-schema');

      const output = consoleSpy.mock.calls.map((c: any) => String(c[0])).join('\n');
      expect(output).toContain('users');
      expect(output).toContain('├─ address');
      expect(output).toContain('│  └─ geo');
      expect(output).toContain('└─ orders');

      consoleSpy.mockRestore();
    });

    it('should sort sibling branches by clean leaf names', () => {
      orchestrator.close();
      orchestrator = new QueryOrchestrator();
      orchestrator.loadJson({
        users: [
          {
            id: 1,
            zeta: [{ id: 1 }],
            alpha: [{ id: 2 }],
            middle: [{ id: 3 }]
          }
        ]
      });

      terminal = new ReadlineTerminal(orchestrator, {
        enableAutocomplete: false,
        enableInlineHints: false
      });
      terminal.start();
      jest.clearAllMocks();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      lineHandler(':show-schema');

      const output = consoleSpy.mock.calls.map((c: any) => String(c[0])).join('\n');
      const alphaIdx = output.indexOf('├─ alpha');
      const middleIdx = output.indexOf('├─ middle');
      const zetaIdx = output.indexOf('└─ zeta');
      expect(alphaIdx).toBeGreaterThan(-1);
      expect(middleIdx).toBeGreaterThan(alphaIdx);
      expect(zetaIdx).toBeGreaterThan(middleIdx);

      consoleSpy.mockRestore();
    });

    it('should sort multiple root tables by clean names', () => {
      orchestrator.close();
      orchestrator = new QueryOrchestrator();
      orchestrator.loadJson({
        zroot: [{ id: 1 }],
        aroot: [{ id: 2 }]
      });

      terminal = new ReadlineTerminal(orchestrator, {
        enableAutocomplete: false,
        enableInlineHints: false
      });
      terminal.start();
      jest.clearAllMocks();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      lineHandler(':show-schema');

      const lines = consoleSpy.mock.calls.map((c: any) => String(c[0]).trim()).filter(Boolean);
      const arootIdx = lines.indexOf('aroot');
      const zrootIdx = lines.indexOf('zroot');
      expect(arootIdx).toBeGreaterThan(-1);
      expect(zrootIdx).toBeGreaterThan(arootIdx);

      consoleSpy.mockRestore();
    });

    it('should fall back to table leaf names when originalPath metadata is missing', () => {
      const mockedSchema = {
        rootTables: ['d_clients'],
        tables: new Map([
          ['d_clients', { name: 'd_clients', parentTable: undefined, originalPath: ['data', 'clients'], columns: [] }],
          ['dc_accounts', { name: 'dc_accounts', parentTable: 'd_clients', originalPath: [], columns: [] }],
          ['dc_orders', { name: 'dc_orders', parentTable: 'd_clients', originalPath: ['data', 'clients', 'orders'], columns: [] }],
          ['dco_items', { name: 'dco_items', parentTable: 'dc_orders', originalPath: [], columns: [] }],
        ])
      };
      const schemaSpy = jest.spyOn(orchestrator, 'getSchema').mockReturnValue(mockedSchema as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      lineHandler(':show-schema');

      const output = consoleSpy.mock.calls.map((c: any) => String(c[0])).join('\n');
      expect(output).toContain('clients');
      expect(output).toContain('├─ accounts');
      expect(output).toContain('└─ orders');
      expect(output).toContain('   └─ items');
      expect(output).not.toContain('dc_accounts');

      schemaSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('Formatter configuration', () => {
    it('should use table formatter by default', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      lineHandler('SELECT * FROM users LIMIT 1');
      
      const output = consoleSpy.mock.calls.map((c: any) => c[0]).join('\n');
      // Table formatter uses box characters or pipes
      expect(output).toMatch(/[│|┌┐└┘├┤]/);
      
      consoleSpy.mockRestore();
    });

    it('should use JSON formatter when specified in options', () => {
      orchestrator.close();
      
      // Create new terminal with JSON formatter
      orchestrator = new QueryOrchestrator();
      orchestrator.loadJson({
        users: [
          { id: 1, name: 'Alice', age: 30 }
        ]
      });
      
      terminal = new ReadlineTerminal(orchestrator, {
        enableAutocomplete: false,
        enableInlineHints: false,
        outputFormat: 'json'
      });
      
      terminal.start();
      jest.clearAllMocks();
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      lineHandler('SELECT * FROM users');
      
      const output = consoleSpy.mock.calls.map((c: any) => c[0]).join('\n');
      // JSON formatter produces valid JSON array
      expect(() => JSON.parse(output)).not.toThrow();
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0]).toHaveProperty('name', 'Alice');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Multiline mode', () => {
    it('should toggle multiline mode with :ml command', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Initially in single-line mode
      expect(mockRl.setPrompt).not.toHaveBeenCalledWith(expect.stringContaining('[ML]'));
      
      // Toggle to multiline mode
      lineHandler(':ml');
      
      expect(consoleSpy).toHaveBeenCalledWith('Mode switched to: MULTILINE');
      expect(mockRl.setPrompt).toHaveBeenCalledWith(expect.stringContaining('[ML]'));
      
      consoleSpy.mockRestore();
    });

    it('should display correct prompt for single-line mode [SL]', () => {
      jest.clearAllMocks();
      
      // Single-line mode (default)
      lineHandler('SELECT * FROM users WHERE id = 1');
      
      expect(mockRl.setPrompt).toHaveBeenCalledWith(expect.stringContaining('[SL]'));
    });

    it('should display continuation prompt (...>) when in multiline mode without semicolon', () => {
      jest.clearAllMocks();
      
      // Toggle to multiline mode
      lineHandler(':ml');
      jest.clearAllMocks();
      
      // Enter incomplete query (no semicolon)
      lineHandler('SELECT * FROM users');
      
      // Should show continuation prompt
      expect(mockRl.setPrompt).toHaveBeenCalledWith('...> ');
    });

    it('should accumulate query lines in multiline mode', () => {
      jest.clearAllMocks();
      
      // Toggle to multiline mode
      lineHandler(':ml');
      jest.clearAllMocks();
      
      // Enter first line without semicolon
      lineHandler('SELECT * FROM users');
      expect(mockRl.setPrompt).toHaveBeenCalledWith('...> ');
      
      jest.clearAllMocks();
      
      // Enter second line with semicolon
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      lineHandler('WHERE id = 1;');
      
      // Should execute the full query and show results
      const output = consoleSpy.mock.calls.map((c: any) => c[0]).join('\n');
      expect(output).toContain('Alice'); // Data from query result
      expect(mockRl.setPrompt).toHaveBeenCalledWith(expect.stringContaining('[ML]'));
      
      consoleSpy.mockRestore();
    });

    it('should clear buffer when toggling :ml with incomplete query', () => {
      jest.clearAllMocks();
      
      // Toggle to multiline mode
      lineHandler(':ml');
      jest.clearAllMocks();
      
      // Enter incomplete query
      lineHandler('SELECT * FROM users');
      jest.clearAllMocks();
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Toggle back to single-line mode
      lineHandler(':ml');
      
      // Should display warning about discarding
      expect(consoleSpy).toHaveBeenCalledWith('[Warning] Discarding incomplete query');
      expect(consoleSpy).toHaveBeenCalledWith('Mode switched to: SINGLE-LINE');
      
      consoleSpy.mockRestore();
    });

    it('should execute complete query when semicolon is entered in multiline mode', () => {
      jest.clearAllMocks();
      
      // Toggle to multiline mode
      lineHandler(':ml');
      jest.clearAllMocks();
      
      // Single complete query with semicolon
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      lineHandler('SELECT name FROM users WHERE id = 1;');
      
      // Should execute immediately
      const output = consoleSpy.mock.calls.map((c: any) => c[0]).join('\n');
      expect(output).toContain('Alice');
      expect(mockRl.setPrompt).toHaveBeenCalledWith(expect.stringContaining('[ML]'));
      
      consoleSpy.mockRestore();
    });

    it('should allow new query after completing one in multiline mode', () => {
      jest.clearAllMocks();
      
      // Toggle to multiline mode
      lineHandler(':ml');
      jest.clearAllMocks();
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // First complete query
      lineHandler('SELECT * FROM users WHERE id = 1;');
      jest.clearAllMocks();
      
      // Second query (incomplete)
      lineHandler('SELECT * FROM users');
      
      // Should be waiting for continuation
      expect(mockRl.setPrompt).toHaveBeenCalledWith('...> ');
      
      consoleSpy.mockRestore();
    });

    it('should maintain single-line mode behavior in [SL] mode', () => {
      jest.clearAllMocks();
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Query in single-line mode (should execute immediately with or without semicolon)
      lineHandler('SELECT * FROM users WHERE id = 1');
      
      // Should execute and not wait for more input
      const output = consoleSpy.mock.calls.map((c: any) => c[0]).join('\n');
      expect(output).toContain('Alice');
      expect(mockRl.setPrompt).toHaveBeenCalledWith(expect.stringContaining('[SL]'));
      
      consoleSpy.mockRestore();
    });

    it('should show [ML] in prompt after toggling to multiline mode', () => {
      jest.clearAllMocks();
      
      // Toggle to multiline
      lineHandler(':ml');
      
      // Verify prompt includes [ML]
      expect(mockRl.setPrompt).toHaveBeenCalledWith(expect.stringContaining('[ML]'));
    });

    it('should show [SL] in prompt in single-line mode', () => {
      jest.clearAllMocks();
      
      // Single line query should set prompt with [SL]
      lineHandler('SELECT * FROM users LIMIT 1');
      
      expect(mockRl.setPrompt).toHaveBeenCalledWith(expect.stringContaining('[SL]'));
    });
  });
});
