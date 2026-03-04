# Development & Testing Guide

Guide for developing, testing, and debugging jwax.

## Project Structure

jwax is a monorepo with three packages:

| Package | Description |
|---------|-------------|
| `packages/core` | Shared library — orchestrator, engine, schema, transform, formatter |
| `packages/cli` | CLI tool — terminal REPL, commander entry point |
| `packages/vscode` | VS Code extension — command palette integration |

All packages are managed via npm workspaces. The root `package.json` orchestrates builds and tests across all packages.

## Development Mode

### CLI

```bash
# Interactive mode
npm run dev -- samples/demo.json

# With options
npm run dev -- --strict-schema --timeout 10 samples/demo.json

# Non-interactive with query
npm run dev -- --query "SELECT * FROM users" samples/demo.json
```

### VS Code Extension

Press **F5** in VS Code to launch the Extension Development Host. See [VS Code Extension Guide](vscode-extension.md) for details.

## Building

### Build All Packages

```bash
npm run build
```

This builds `core` → `cli` → `vscode` in dependency order using TypeScript project references.

### Build Individual Packages

```bash
cd packages/core && npm run build
cd packages/cli && npm run build
cd packages/vscode && npm run build
```

### Clean Build

```bash
npm run clean && npm run build
```

## Testing

### Running Tests

```bash
# Verify native better-sqlite3 readiness (local dev)
npm run native:check

# Repair native better-sqlite3 bindings, then re-check
npm run native:fix

# Run all tests across all packages (runs native:check first)
npm test

# Run tests for a specific package (core/cli run native check first)
cd packages/core && npm test
cd packages/cli && npm test
cd packages/vscode && npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Test Coverage

| Package | Tests | Description |
|---------|-------|-------------|
| **Core** | 205 | Engine, schema discovery, transform, orchestrator, formatter |
| **CLI** | 29 | Terminal REPL, autocomplete |
| **VS Code** | 31 | Helpers, sql.js adapter, integration |
| **Total** | **265** | **Across all packages** |

### Core Test Suites

| Component | Tests | Description |
|-----------|-------|-------------|
| Engine | 24 | SQLite adapter, query execution |
| Schema Discovery | 37 | JSON structure analysis, type inference |
| Data Transformation | 26 | Flattening, ID generation, type coercion |
| Orchestrator | 19 | Pipeline coordination |
| Formatters | 24 | Table and JSON output formatting |
| Loader | ~10 | File, URL, stdin loading |
| Performance | 10 | Large files, deep nesting, dynamic schemas |

## Performance Testing

```bash
npm run test:perf
```

Performance tests measure:
- **Large JSON files**: 50MB, 5000+ objects
- **Deep nesting**: 20-25 levels of nested structures
- **Dynamic schemas**: Varying properties, optional fields, mixed types

See `packages/core/test/performance/README.md` for detailed documentation.

## Debugging

### VS Code Extension

The `.vscode/launch.json` includes a configuration for the Extension Development Host. Press **F5** to start debugging the extension with breakpoints.

### CLI Debugging

```bash
# Debug with Node.js inspector
node --inspect-brk -r ts-node/register packages/cli/bin/jwax.ts samples/demo.json

# Then open chrome://inspect in Chrome
```

### Debug Single Test

```bash
node --inspect-brk node_modules/.bin/jest packages/core/test/orchestrator.test.ts
```
