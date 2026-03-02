import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/cli-config.ts'],
  format: ['cjs'],
  dts: true,
  external: ['better-sqlite3'],
  clean: true,
  sourcemap: true,
});
