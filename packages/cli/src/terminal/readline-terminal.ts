import * as readline from 'readline';
import * as fs from 'fs';
import { QueryOrchestrator, createFormatter, OutputFormatter } from '@jwax/core';
import { ITerminalInterface, TerminalOptions } from './interface';

export class ReadlineTerminal implements ITerminalInterface {
  private rl: readline.Interface | null = null;
  private orchestrator: QueryOrchestrator;
  private options: Required<Omit<TerminalOptions, 'loadTimeMs'>> & { loadTimeMs?: number };
  private currentHint: string = '';
  private formatter: OutputFormatter;
  private multilineMode: boolean = false;
  private multilineBuffer: string = '';
  private loadTimeMs?: number;
  private input: NodeJS.ReadStream;

  constructor(orchestrator: QueryOrchestrator, options: TerminalOptions = {}) {
    this.orchestrator = orchestrator;
    this.options = {
      enableAutocomplete: options.enableAutocomplete ?? true,
      enableInlineHints: options.enableInlineHints ?? true,
      outputFormat: options.outputFormat ?? 'table',
      loadTimeMs: options.loadTimeMs,
    };
    this.loadTimeMs = options.loadTimeMs;
    this.formatter = createFormatter(this.options.outputFormat);
    this.input = this.resolveInput();
  }

  start(): void {
    const completer = this.options.enableAutocomplete
      ? this.createCompleter()
      : undefined;

    this.rl = readline.createInterface({
      input: this.input,
      output: process.stdout,
      prompt: this.getPrompt(),
      completer,
    });

    const tables = this.orchestrator.listTables();
    const timingInfo = this.loadTimeMs !== undefined ? ` in ${Math.round(this.loadTimeMs)}ms` : '';
    console.log(`Discovered ${tables.length} table(s)${timingInfo}.`);
    console.log('Enter SQL queries (type :help for commands, :schema to view loaded schemas, :quit to exit).\n');

    if (this.options.enableInlineHints) {
      this.setupInlineHints();
    }

    this.rl.prompt();

    this.rl.on('line', (line: string) => {
      this.handleLine(line);
    });

    this.rl.on('close', () => {
      this.orchestrator.close();
      console.log('Goodbye.');
      process.exit(0);
    });
  }

  close(): void {
    if (this.rl) {
      this.rl.close();
    }
  }

  private createCompleter(): readline.Completer {
    const tableNames = this.orchestrator.listTables();
    return (line: string): readline.CompleterResult => {
      const words = line.trim().split(/\s+/);
      const lastWord = words[words.length - 1] || '';

      if (!lastWord) {
        return [tableNames, lastWord];
      }

      const lowerLastWord = lastWord.toLowerCase();
      const matches = tableNames.filter(table =>
        table.toLowerCase().includes(lowerLastWord)
      );

      return [matches, lastWord];
    };
  }

  private setupInlineHints(): void {
    if (!this.input.isTTY) return;

    readline.emitKeypressEvents(this.input);
    if (this.input.setRawMode) {
      this.input.setRawMode(true);
    }

    const tableNames = this.orchestrator.listTables();

    this.input.on('keypress', (char: string, key: any) => {
      if (!this.rl || !key) return;

      // Handle Ctrl+C
      if (key.ctrl && key.name === 'c') {
        this.clearHint();
        return;
      }

      // Handle Right arrow or End key to accept hint
      if ((key.name === 'right' || key.name === 'end') && this.currentHint) {
        this.acceptHint();
        return;
      }

      // Update hint after other keypresses
      if (key.name === 'backspace' || key.name === 'delete' || 
          (char && !key.ctrl && !key.meta)) {
        setTimeout(() => this.updateHint(tableNames), 10);
      }
    });
  }

  private resolveInput(): NodeJS.ReadStream {
    if (process.stdin.isTTY) {
      return process.stdin;
    }

    try {
      return fs.createReadStream('/dev/tty') as unknown as NodeJS.ReadStream;
    } catch {
      return process.stdin;
    }
  }

  private updateHint(tableNames: string[]): void {
    if (!this.rl) return;

    const line = (this.rl as any).line || '';
    const cursor = (this.rl as any).cursor || 0;

    // Only show hint if cursor is at end of line
    if (cursor !== line.length) {
      this.clearHint();
      return;
    }

    const hint = this.findBestHint(line, tableNames);

    if (hint && hint !== this.currentHint) {
      this.clearHint();
      this.currentHint = hint;
      this.renderHint(hint);
    } else if (!hint && this.currentHint) {
      this.clearHint();
    }
  }

  private findBestHint(line: string, tableNames: string[]): string {
    const words = line.trim().split(/\s+/);
    const lastWord = words[words.length - 1] || '';

    if (!lastWord || lastWord.length === 0) {
      return '';
    }

    const lowerLastWord = lastWord.toLowerCase();

    // Find tables that start with the last word (prefix match)
    const prefixMatches = tableNames.filter(table =>
      table.toLowerCase().startsWith(lowerLastWord)
    );

    if (prefixMatches.length > 0) {
      // Return the completion part (not including what's already typed)
      const bestMatch = prefixMatches[0];
      return bestMatch.substring(lastWord.length);
    }

    return '';
  }

  private renderHint(hint: string): void {
    if (!hint) return;
    // \x1b[90m = dim/grey, \x1b[0m = reset
    process.stdout.write(`\x1b[90m${hint}\x1b[0m`);
    // Move cursor back to current position
    process.stdout.write(`\x1b[${hint.length}D`);
  }

  private clearHint(): void {
    if (!this.currentHint) return;
    // Clear from cursor to end of line
    process.stdout.write('\x1b[K');
    this.currentHint = '';
  }

  private acceptHint(): void {
    if (!this.rl || !this.currentHint) return;

    // Add hint to current line
    const currentLine = (this.rl as any).line || '';
    (this.rl as any).line = currentLine + this.currentHint;
    (this.rl as any).cursor = (this.rl as any).line.length;

    // Clear hint and re-render line
    this.clearHint();
    (this.rl as any)._refreshLine();
  }

  private handleLine(line: string): void {
    this.clearHint();

    const trimmed = (line || '').trim();
    if (!trimmed) {
      this.rl?.prompt();
      return;
    }

    // Handle multiline mode toggle
    if (trimmed === ':ml') {
      if (this.multilineBuffer) {
        console.log('[Warning] Discarding incomplete query');
        this.multilineBuffer = '';
      }
      this.multilineMode = !this.multilineMode;
      const mode = this.multilineMode ? 'MULTILINE' : 'SINGLE-LINE';
      console.log(`Mode switched to: ${mode}`);
      if (this.rl) {
        this.rl.setPrompt(this.getPrompt());
      }
      this.rl?.prompt();
      return;
    }

    // Handle special commands
    if (trimmed === ':quit' || trimmed === ':exit') {
      this.rl?.close();
      return;
    }

    if (trimmed === ':help') {
      this.showHelp();
      if (this.rl) {
        this.rl.setPrompt(this.getPrompt());
      }
      this.rl?.prompt();
      return;
    }

    if (trimmed === ':tables') {
      this.showTables();
      if (this.rl) {
        this.rl.setPrompt(this.getPrompt());
      }
      this.rl?.prompt();
      return;
    }

    if (trimmed === ':schema' || trimmed.startsWith(':schema ')) {
      this.showSchema(trimmed);
      if (this.rl) {
        this.rl.setPrompt(this.getPrompt());
      }
      this.rl?.prompt();
      return;
    }

    // Handle SQL query (single-line or multiline mode)
    if (this.multilineMode) {
      // Accumulate in buffer
      this.multilineBuffer += (this.multilineBuffer ? '\n' : '') + trimmed;

      // Check if query is complete (ends with semicolon)
      if (this.multilineBuffer.trim().endsWith(';')) {
        // Execute accumulated query
        const queryToExecute = this.multilineBuffer;
        this.multilineBuffer = ''; // Clear for next query

        try {
          const result = this.orchestrator.executeQuery(queryToExecute);
          if (result.rows.length === 0) {
            console.log('Your query returned no results.');
          } else {
            console.log(this.formatter.format(result));
          }
        } catch (err: any) {
          console.error('Query error:', err.message ?? err);
        }

        // Back to normal prompt
        if (this.rl) {
          this.rl.setPrompt(this.getPrompt());
        }
        this.rl?.prompt();
      } else {
        // Not complete, show continuation prompt
        if (this.rl) {
          this.rl.setPrompt('...> ');
        }
        this.rl?.prompt();
      }
    } else {
      // SINGLE-LINE MODE (original behavior)
      try {
        const result = this.orchestrator.executeQuery(trimmed);
        if (result.rows.length === 0) {
          console.log('Your query returned no results.');
        } else {
          console.log(this.formatter.format(result));
        }
      } catch (err: any) {
        console.error('Query error:', err.message ?? err);
      }
      if (this.rl) {
        this.rl.setPrompt(this.getPrompt());
      }
      this.rl?.prompt();
    }
  }

  private showHelp(): void {
    console.log('Commands:');
    console.log('  :help       - Show this help');
    console.log('  :quit       - Exit the CLI');
    console.log('  :ml         - Toggle between single-line and multiline mode');
    console.log('  :tables     - List all available tables');
    console.log('  :schema     - Show detailed schema for all tables');
    console.log('  :schema <table> - Show schema for specific table');
    console.log('\nMode indicators in prompt:');
    console.log('  [SL]        - Single-line mode (default)');
    console.log('  [ML]        - Multiline mode');
    console.log('  ...>        - Continuation line (waiting for more input)');
    console.log('\nMultiline mode:');
    console.log('  Enter :ml to toggle multiline mode');
    console.log('  Type queries across multiple lines');
    console.log('  Press Enter after each line (without semicolon to continue)');
    console.log('  Terminate with semicolon (;) to execute');
    console.log('\nAutocomplete:');
    console.log('  Tab         - Cycle through table name matches');
    if (this.options.enableInlineHints) {
      console.log('  Right/End   - Accept inline hint suggestion');
    }
    console.log('\nSQL Syntax:');
    console.log('  SELECT <columns> FROM <table> [WHERE <condition>] [ORDER BY <column>] [LIMIT <n>]');
    console.log('  Supports: WHERE, ORDER BY, GROUP BY, JOINs, aggregations (COUNT, AVG, SUM, MIN, MAX)');
    console.log('\nExamples:');
    console.log('  SELECT * FROM users');
    console.log('  SELECT name, age FROM users WHERE age > 25 ORDER BY age DESC');
    console.log('  SELECT COUNT(*) FROM users');
  }

  private showTables(): void {
    const tables = this.orchestrator.listTables();
    if (tables.length === 0) {
      console.log('No tables available.');
    } else {
      console.log('Available tables:');
      tables.forEach(table => console.log(`  - ${table}`));
    }
  }

  private showSchema(command: string): void {
    const parts = command.split(/\s+/);
    const targetTable = parts[1];

    const schema = this.orchestrator.getSchema();
    if (!schema || schema.tables.size === 0) {
      console.log('No schema available.');
      return;
    }

    if (targetTable) {
      // Show specific table
      const tableSchema = this.orchestrator.getTableSchema(targetTable);
      if (!tableSchema) {
        console.log(`Table '${targetTable}' not found.`);
      } else {
        console.log(`\nTable: ${tableSchema.name}`);
        if (tableSchema.parentTable) {
          console.log(`Parent: ${tableSchema.parentTable} (via ${tableSchema.parentKey})`);
        }
        console.log('Columns:');
        tableSchema.columns.forEach(col => {
          const parts = [`  ${col.name}`, col.type];
          if (col.primaryKey) parts.push('PRIMARY KEY');
          if (col.nullable === false) parts.push('NOT NULL');
          console.log(parts.join(' '));
        });
      }
    } else {
      // Show all tables
      console.log('\nDatabase Schema:');
      schema.tables.forEach((table, name) => {
        console.log(`\n${name}:`);
        if (table.parentTable) {
          console.log(`  Parent: ${table.parentTable} (via ${table.parentKey})`);
        }
        console.log(`  Columns: ${table.columns.map(c => `${c.name}:${c.type}`).join(', ')}`);
      });
    }
  }

  public getBestHint(line: string): string {
    return this.findBestHint(line, this.orchestrator.listTables());
  }

  private getPrompt(): string {
    const modeIndicator = this.multilineMode ? '[ML]' : '[SL]';
    return `jwax> ${modeIndicator} `;
  }
}
