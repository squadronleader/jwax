# VS Code Extension Guide

Build, run, and package the jwax VS Code extension.

## Overview

The jwax VS Code extension lets you query JSON files open in your editor using SQL. It uses the command palette to accept queries and displays results in an Output Channel — no terminal required.

## Prerequisites

- **Node.js** 18+
- **VS Code** 1.85+
- **npm** 9+

## Building

From the **repository root**:

```bash
npm install
npm run build
```

This builds all packages (`core`, `cli`, `vscode`) in dependency order. The extension output is in `packages/vscode/dist/`.

To build only the extension (after core is already built):

```bash
cd packages/vscode
npm run build
```

## Running in Development

### Using VS Code (Recommended)

1. Open the repository root in VS Code
2. Press **F5** (or **Run → Start Debugging**)
3. A new **Extension Development Host** window opens with the extension loaded
4. Open any `.json` file in the new window
5. Use **Cmd+Shift+P** → type `jwax` to access commands

The included `.vscode/launch.json` configuration handles building and launching automatically.

### Manual Launch

If you prefer not to use the launch configuration:

```bash
# Build everything
npm run build

# Then press F5 in VS Code, or:
# Run → Start Debugging → select "Run Extension"
```

## Commands

All commands are available via the **Command Palette** (`Cmd+Shift+P` / `Ctrl+Shift+P`):

| Command | ID | Description |
|---------|----|-------------|
| **jwax: Run SQL Query** | `jwax.runQuery` | Prompts for a SQL query, executes it against the active JSON file, and shows results |
| **jwax: Show Tables** | `jwax.showTables` | Lists all tables discovered from the active JSON file |
| **jwax: Show Schema** | `jwax.showSchema` | Shows column names and types for all discovered tables |

### Workflow

1. Open a `.json` file in the editor
2. Run a command from the palette
3. For **Run SQL Query**: enter your SQL in the input box that appears
4. Results appear in the **jwax** Output Channel (View → Output → select "jwax")

### Error Handling

- **No active editor**: A notification asks you to open a JSON file first
- **Non-JSON file**: A notification warns the active file doesn't appear to be JSON
- **Invalid JSON**: A notification shows a parse error with details
- **SQL errors**: The error message appears in the Output Channel

## Architecture

The extension reuses `@jwax/core` for all SQL logic (schema discovery, data transformation, query execution).

```
packages/vscode/
├── src/
│   ├── extension.ts       # activate/deactivate, command registration
│   ├── helpers.ts         # Pure testable functions (parsing, formatting)
│   └── sqljs-adapter.ts   # sql.js (WASM) implementation of SQLEngineAdapter
├── test/
│   ├── helpers.test.ts        # Unit tests for helper functions
│   ├── sqljs-adapter.test.ts  # Unit tests for SQL engine adapter
│   └── integration/           # VS Code integration tests
├── package.json           # Extension manifest (commands, activation events)
├── tsconfig.json
├── jest.config.js
├── .vscodeignore
└── README.md
```

### Why sql.js instead of better-sqlite3?

VS Code runs on Electron, which bundles a different Node.js version than your system. Native addons like `better-sqlite3` are compiled against a specific `NODE_MODULE_VERSION` and fail when the versions don't match.

The extension uses **sql.js** — SQLite compiled to WebAssembly — which runs in any JavaScript environment without native compilation. Performance is effectively identical for typical JSON files (sub-second for files up to 50MB).

The CLI continues to use `better-sqlite3` for maximum performance. Both implement the same `SQLEngineAdapter` interface from `@jwax/core`.

## Testing

### Unit Tests

```bash
cd packages/vscode
npm test
```

This runs Jest tests for helper functions and the sql.js adapter (31 tests).

### Integration Tests

Integration tests use `@vscode/test-electron` to launch a real VS Code instance:

```bash
cd packages/vscode
npm run test:integration
```

### All Tests (from root)

```bash
npm test
```

Runs tests for all packages: core (205), cli (29), vscode (31).

## Packaging

To create a `.vsix` package for distribution:

```bash
# Install vsce if you haven't
npm install -g @vscode/vsce

# Build everything first
npm run build

# Package the extension
cd packages/vscode
vsce package
```

This creates a `jwax-<version>.vsix` file.

### Installing the VSIX

```bash
code --install-extension jwax-<version>.vsix
```

Or in VS Code: **Extensions → ⋯ → Install from VSIX...**

## Publishing to Marketplace

```bash
# One-time: create a publisher
vsce create-publisher <publisher-name>

# Login
vsce login <publisher-name>

# Publish
cd packages/vscode
vsce publish
```

See the [VS Code Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) for full details on setting up a publisher and personal access token.

## Troubleshooting

### "command not found" after F5

Make sure the build completed successfully. Check the terminal for build errors. The `preLaunchTask` in `.vscode/launch.json` runs `npm run build` from the workspace root.

### Extension doesn't activate

Commands are lazily activated — they only load when you invoke a `jwax.*` command from the palette. If nothing appears when you type `jwax`, check that `packages/vscode/package.json` has the correct `main` field pointing to `./dist/src/extension.js`.

### Output Channel doesn't appear

After running a command, switch to **View → Output** and select **jwax** from the dropdown in the Output panel.
