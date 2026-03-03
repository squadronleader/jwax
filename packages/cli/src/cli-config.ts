/**
 * Shared CLI options configuration
 * Single source of truth for all CLI flags and options
 * Used by both TypeScript (bin/jwax.ts) and JavaScript (bin/jwax.js) entry points
 */

export interface CliOptionConfig {
  flags: string;
  description: string;
  defaultValue?: string | number | ((val: string) => number);
}

export const CLI_OPTIONS: CliOptionConfig[] = [
  {
    flags: '--strict-schema',
    description: 'Use strict schema validation',
  },
  {
    flags: '--timeout <seconds>',
    description: 'Timeout for loading URLs (in seconds)',
    defaultValue: (val: string) => parseInt(val, 10) * 1000,
  },
  {
    flags: '--output-format <format>',
    description: 'Output format (table or json)',
    defaultValue: 'table',
  },
  {
    flags: '--query <sql>',
    description: 'Execute SQL query and exit (non-interactive mode)',
  },
  {
    flags: '-i, --interactive',
    description: 'Force interactive mode when reading from stdin',
  },
  {
    flags: '--root-name <name>',
    description: 'Override the default root table name (default: root)',
  },
  {
    flags: '--no-timing',
    description: 'Suppress load time display',
  },
];
