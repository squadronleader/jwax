# Project Structure (High Level)

This repository is an npm workspaces monorepo with three main packages and shared root tooling.

```
jsontosql/
├── packages/
│   ├── core/        # Shared JSON-to-SQL engine and pipeline logic
│   ├── cli/         # Command-line interface for querying JSON with SQL
│   └── vscode/      # VS Code extension integration
├── bin/             # Root executable entry points
├── docs/            # Project documentation
├── samples/         # Example JSON files
├── scripts/         # Repo automation and helper scripts
├── build/           # Build-related assets/config used by tooling
├── site/            # Generated/served docs site artifacts
├── prebuilds/       # Prebuilt native assets
├── package.json     # Workspace and root scripts
└── tsconfig.json    # Root TypeScript configuration
```

## Package roles

- **`packages/core`**: Shared library used by the CLI and VS Code extension.
- **`packages/cli`**: Terminal app and REPL experience.
- **`packages/vscode`**: Extension commands and editor-facing integration.

## How the pieces fit together

1. A consumer (`cli` or `vscode`) accepts JSON input and SQL queries.
2. It delegates JSON loading/transformation/query execution to `core`.
3. Results are returned to the consumer and formatted for terminal/editor output.
