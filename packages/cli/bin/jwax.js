#!/usr/bin/env node
const { startCli, startNonInteractiveCli } = require('../dist/cli');
const { CLI_OPTIONS } = require('../dist/cli-config');
const { Command } = require('commander');

const program = new Command();

program
  .name('jwax')
  .description('Query JSON files with full SQL syntax using SQLite')
  .version('1.0.0')
  .argument('[source]', 'Path to JSON file, URL, or "-" for stdin (omit to read from stdin)');

for (const option of CLI_OPTIONS) {
  if (option.defaultValue !== undefined) {
    program.option(option.flags, option.description, option.defaultValue);
  } else {
    program.option(option.flags, option.description);
  }
}

program.parse();

let [source] = program.args;
const opts = program.opts();
const isStdinInput = source === '-' || (!source && !process.stdin.isTTY);

if (isStdinInput) {
  source = null;
}

const validFormats = ['table', 'json'];
if (opts.outputFormat && !validFormats.includes(opts.outputFormat)) {
  console.error(`Error: Invalid output format "${opts.outputFormat}". Must be "table" or "json".`);
  process.exit(2);
}

const outputFormat = opts.outputFormat || 'table';
const cliOptions = {
  strictSchema: opts.strictSchema,
  timeoutMs: opts.timeout,
  outputFormat,
  tableName: opts.tableName,
  showTiming: opts.timing,
};

if (isStdinInput) {
  if (opts.interactive) {
    startCli(source, cliOptions).catch((err) => {
      console.error('Fatal error:', err && err.message ? err.message : err);
      process.exit(1);
    });
  } else if (opts.query) {
    startNonInteractiveCli(source, opts.query, cliOptions).catch((err) => {
      console.error('Error:', err && err.message ? err.message : err);
      process.exit(1);
    });
  } else {
    console.error('Error: When reading from stdin, you must provide either --query <sql> or --interactive flag.');
    console.error('Examples:');
    console.error('  cat data.json | jwax --query "SELECT * FROM data"');
    console.error('  curl https://api.example.com/users | jwax -i');
    process.exit(2);
  }
} else if (opts.query) {
  startNonInteractiveCli(source, opts.query, cliOptions).catch((err) => {
    console.error('Error:', err && err.message ? err.message : err);
    process.exit(1);
  });
} else {
  startCli(source, cliOptions).catch((err) => {
    console.error('Fatal error:', err && err.message ? err.message : err);
    process.exit(1);
  });
}
