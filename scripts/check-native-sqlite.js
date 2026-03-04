'use strict';

const warnOnly = process.argv.includes('--warn-only');

function fail(message, error) {
  console.error('\n[Native Check] better-sqlite3 is not ready.');
  console.error(message);
  if (error) {
    console.error(`\nUnderlying error: ${error.message || String(error)}`);
  }
  console.error('\nTry:\n  npm rebuild better-sqlite3 --workspace=@jwax/core');
  console.error('  npm rebuild better-sqlite3 --workspace=@squadronleader/jwax\n');
  if (warnOnly) {
    console.error('[Native Check] Continuing in warn-only mode.\n');
    return;
  }
  process.exit(1);
}

let Database;
try {
  Database = require('better-sqlite3');
} catch (error) {
  fail('Failed to load the native module.', error);
  if (warnOnly) {
    process.exit(0);
  }
}

try {
  const db = new Database(':memory:');
  db.prepare('SELECT 1').get();
  db.close();
  console.log('[Native Check] better-sqlite3 is ready.');
} catch (error) {
  fail('Failed to initialize the in-memory SQLite database.', error);
  if (warnOnly) {
    process.exit(0);
  }
}
