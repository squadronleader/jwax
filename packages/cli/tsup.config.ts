import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/cli-config.ts'],
  format: ['cjs'],
  dts: true,
  external: ['better-sqlite3', 'sql.js'],
  clean: true,
  sourcemap: true,
});
