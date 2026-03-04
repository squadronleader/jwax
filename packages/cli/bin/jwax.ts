#!/usr/bin/env ts-node
import { Command } from 'commander';
import { startCli, startNonInteractiveCli } from '../src/cli';
import { FormatterType } from '@jwax/core';
import { CLI_OPTIONS } from '../src/cli-config';
const { version } = require('../package.json');

const program = new Command();

program
  .name('jwax')
  .description('Query JSON files with full SQL syntax using SQLite')
  .version(version)
  .argument('[source]', 'Path to JSON file, URL, or "-" for stdin (omit to read from stdin)');

// Dynamically add all options from shared config
for (const option of CLI_OPTIONS) {
  const fn = program.option as any;
  if (option.defaultValue !== undefined) {
    fn.call(program, option.flags, option.description, option.defaultValue);
  } else {
    fn.call(program, option.flags, option.description);
  }
}

program.parse();

let [source] = program.args;
const opts = program.opts<{
  strictSchema?: boolean;
  timeout?: number;
  outputFormat?: string;
  engine?: string;
  query?: string;
  interactive?: boolean;
  rootName?: string;
  timing?: boolean;
}>();

// Detect stdin: no source provided and stdin is not a TTY, or explicit '-'
const isStdinInput = source === '-' || (!source && !process.stdin.isTTY);

// Normalize stdin source to null for loader
if (isStdinInput) {
  source = null as any;
}

// Validate output format
const validFormats: FormatterType[] = ['table', 'json'];
if (opts.outputFormat && !validFormats.includes(opts.outputFormat as FormatterType)) {
  console.error(`Error: Invalid output format "${opts.outputFormat}". Must be "table" or "json".`);
  process.exit(2);
}

const outputFormat = (opts.outputFormat || 'table') as FormatterType;
const validEngines = ['auto', 'native', 'wasm'] as const;
if (opts.engine && !validEngines.includes(opts.engine as any)) {
  console.error(`Error: Invalid engine "${opts.engine}". Must be "auto", "native", or "wasm".`);
  process.exit(2);
}

const cliOptions = {
  strictSchema: opts.strictSchema,
  timeoutMs: opts.timeout,
  outputFormat,
  engine: (opts.engine || 'auto') as 'auto' | 'native' | 'wasm',
  tableName: opts.rootName,
  showTiming: opts.timing,
};

// Handle stdin mode selection
if (isStdinInput) {
  if (opts.interactive) {
    // Force interactive mode with stdin
    startCli(source, cliOptions).catch((err: any) => {
      console.error('Fatal error:', err && err.message ? err.message : err);
      process.exit(1);
    });
  } else if (opts.query) {
    // Non-interactive mode with stdin
    startNonInteractiveCli(source, opts.query, cliOptions).catch((err: any) => {
      console.error('Error:', err && err.message ? err.message : err);
      process.exit(1);
    });
  } else {
    // Error: stdin without --query or --interactive
    console.error('Error: When reading from stdin, you must provide either --query <sql> or --interactive flag.');
    console.error('Examples:');
    console.error('  cat data.json | jwax --query "SELECT * FROM data"');
    console.error('  curl https://api.example.com/users | jwax -i');
    process.exit(2);
  }
} else {
  // File or URL mode (existing behavior)
  if (opts.query) {
    // Non-interactive mode
    startNonInteractiveCli(source, opts.query, cliOptions).catch((err: any) => {
      console.error('Error:', err && err.message ? err.message : err);
      process.exit(1);
    });
  } else {
    // Interactive mode
    startCli(source, cliOptions).catch((err: any) => {
      console.error('Fatal error:', err && err.message ? err.message : err);
      process.exit(1);
    });
  }
}
