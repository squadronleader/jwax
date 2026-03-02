import { QueryOrchestrator } from '@jwax/core';
import { ReadlineTerminal } from '../src/terminal';

describe('Terminal Autocomplete', () => {
  let orchestrator: QueryOrchestrator;
  let terminal: ReadlineTerminal;

  beforeEach(() => {
    orchestrator = new QueryOrchestrator();
    const json = {
      users: [{ id: 1, name: 'Alice' }],
      orders: [{ id: 101, total: 99.99 }],
      products: [{ id: 1, name: 'Widget' }],
      users_address: [{ city: 'NYC' }],
      order_items: [{ item_id: 1 }],
    };
    orchestrator.loadJson(json);

    terminal = new ReadlineTerminal(orchestrator, {
      enableAutocomplete: true,
      enableInlineHints: false, // Don't enable hints for unit tests
    });
  });

  afterEach(() => {
    orchestrator.close();
  });

  describe('getBestHint - prefix matching for inline hints', () => {
    it('should return completion for partial prefix match', () => {
      const hint = terminal.getBestHint('us');
      expect(hint).toBe('ers');
    });

    it('should return completion for SELECT query context', () => {
      const hint = terminal.getBestHint('SELECT * FROM us');
      expect(hint).toBe('ers');
    });

    it('should return empty string when no prefix match', () => {
      const hint = terminal.getBestHint('xyz');
      expect(hint).toBe('');
    });

    it('should return empty string for empty input', () => {
      const hint = terminal.getBestHint('');
      expect(hint).toBe('');
    });

    it('should handle case-insensitive matching', () => {
      const hint = terminal.getBestHint('US');
      // Hint returns lowercase completion
      expect(hint).toBe('ers');
    });

    it('should complete with underscore', () => {
      const hint = terminal.getBestHint('users_');
      expect(hint).toBe('address');
    });

    it('should return first match when multiple prefixes exist', () => {
      const hint = terminal.getBestHint('or');
      expect(hint).toMatch(/^(ders|der_items)$/);
    });

    it('should handle exact match', () => {
      const hint = terminal.getBestHint('users');
      // When exact match, could return empty or suggest next match
      // Our implementation prioritizes users over users_address
      expect(hint).toBe('');
    });

    it('should return completion for partial word in multi-word query', () => {
      const hint = terminal.getBestHint('SELECT id FROM prod');
      expect(hint).toBe('ucts');
    });

    it('should handle whitespace after FROM', () => {
      const hint = terminal.getBestHint('SELECT * FROM   ord');
      expect(hint).toMatch(/^(ers|er_items)$/);
    });
  });
});

