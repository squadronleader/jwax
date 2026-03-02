# Application Structure

```
jwax/
├── packages/
│   ├── core/                         # Shared library (used by CLI and VS Code extension)
│   │   ├── src/
│   │   │   ├── index.ts              # Public API barrel export
│   │   │   ├── orchestrator.ts       # Pipeline coordinator: load → discover → transform → query
│   │   │   ├── engine/
│   │   │   │   ├── sqlite-adapter.ts # SQLite wrapper (better-sqlite3, lazy-loaded)
│   │   │   │   └── types.ts          # SQLEngineAdapter interface, QueryResult, ColumnDef
│   │   │   ├── schema/
│   │   │   │   ├── discovery.ts      # JSON → table schema mapping
│   │   │   │   ├── type-inference.ts # Type detection (INTEGER, REAL, TEXT)
│   │   │   │   ├── naming.ts         # Table/column naming conventions
│   │   │   │   └── types.ts          # Schema type definitions
│   │   │   ├── transform/
│   │   │   │   ├── flattener.ts      # JSON → SQL rows conversion
│   │   │   │   ├── id-generator.ts   # Synthetic PK/FK generation
│   │   │   │   └── type-coercion.ts  # Type conversion for SQL
│   │   │   ├── formatter/
│   │   │   │   ├── table-formatter.ts # ASCII table output (cli-table3)
│   │   │   │   └── json-formatter.ts  # JSON output
│   │   │   ├── loader.ts             # JSON loading (file, URL, stdin)
│   │   │   └── table.ts              # Table definitions
│   │   ├── test/                     # Core unit & integration tests (205 tests)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── jest.config.js
│   │
│   ├── cli/                          # CLI tool
│   │   ├── src/
│   │   │   ├── cli.ts                # Commander.js setup and REPL bootstrap
│   │   │   └── terminal/
│   │   │       ├── interface.ts      # Abstract terminal interface (adapter pattern)
│   │   │       └── readline-terminal.ts # Readline-based REPL implementation
│   │   ├── bin/
│   │   │   └── jwax.ts          # CLI entry point
│   │   ├── test/                     # CLI tests (29 tests)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── jest.config.js
│   │
│   └── vscode/                       # VS Code extension
│       ├── src/
│       │   ├── extension.ts          # activate/deactivate, 3 command registrations
│       │   ├── helpers.ts            # Pure testable functions (parsing, formatting)
│       │   └── sqljs-adapter.ts      # sql.js (WASM) SQLEngineAdapter implementation
│       ├── test/
│       │   ├── helpers.test.ts       # Helper function unit tests
│       │   ├── sqljs-adapter.test.ts # sql.js adapter unit tests
│       │   └── integration/          # VS Code integration tests (@vscode/test-electron)
│       ├── package.json              # Extension manifest (commands, activation events)
│       ├── tsconfig.json
│       ├── jest.config.js
│       └── .vscodeignore
│
├── bin/
│   └── jwax.js                  # Global CLI entry point (delegates to packages/cli)
├── samples/                          # Sample JSON files for testing
├── docs/                             # Documentation
├── .vscode/
│   ├── launch.json                   # Extension Development Host debug config
│   └── tasks.json                    # Build task for debugging
├── package.json                      # Root workspace config (npm workspaces)
├── tsconfig.json                     # Root TypeScript config (project references)
├── AGENTS.md                         # AI assistant context
└── README.md                         # Project overview
```

### Data flow — CLI

1. `bin/jwax.js` delegates to `packages/cli/dist/cli.js`
2. Commander.js parses arguments and calls the REPL bootstrap
3. The REPL creates a `QueryOrchestrator` from `@jwax/core`
4. The orchestrator loads JSON, discovers schema, transforms data into SQLite tables
5. SQL queries are executed against the in-memory SQLite database
6. Results are formatted as ASCII tables or JSON

### Data flow — VS Code Extension

1. User invokes a command via the Command Palette
2. `extension.ts` reads JSON from the active editor tab
3. A `QueryOrchestrator` is created with a `SqlJsAdapter` (WASM-based SQLite)
4. The orchestrator discovers schema and transforms data
5. SQL is executed and results are written to the Output Channel

### Key Design Decisions

- **Monorepo with npm workspaces**: Core logic is shared; each consumer (CLI, VS Code) has its own package
- **SQLEngineAdapter interface**: Allows different SQLite implementations — `better-sqlite3` (CLI, native) and `sql.js` (extension, WASM)
- **Lazy-loading of better-sqlite3**: Prevents Electron/Node.js version conflicts when core is imported by the extension
- **Terminal adapter pattern**: The CLI's REPL can swap readline for other frameworks without changing core logic

### Dependencies of Note

- `better-sqlite3` — Native SQLite binding for the CLI (high performance, synchronous)
- `sql.js` — SQLite compiled to WASM for the VS Code extension (no native compilation)
- `commander` — CLI argument parsing
- `cli-table3` — ASCII table formatting
- `@vscode/test-electron` — Integration testing for the VS Code extension

### Testing

- **265 tests** across 3 packages (core: 205, cli: 29, vscode: 31)
- Run all: `npm test` from root
- Per-package: `cd packages/<name> && npm test`
