# CLI Guide

Build, package, and run the jwax command-line tool.

## Overview

The jwax CLI loads JSON files (local, URL, or stdin) and provides an interactive REPL where you can query the data with SQL.

## Prerequisites

- **Node.js** 18+
- **npm** 9+

## Building

From the **repository root**:

```bash
npm install
npm run build
```

This builds all packages in dependency order. The CLI output is in `packages/cli/dist/`.

## Running

### Development Mode (TypeScript)

```bash
# Interactive mode
npm run dev -- samples/demo.json

# With options
npm run dev -- --strict-schema --timeout 10 samples/demo.json

# Non-interactive with query
npm run dev -- --query "SELECT * FROM users" samples/demo.json
```

### Compiled Mode (JavaScript)

After building:

```bash
npm start -- samples/demo.json

# With options
npm start -- --query "SELECT * FROM users" samples/demo.json
```

### From npm

```bash
# Install globally
npm install -g @squadronleader/jwax

# Run the CLI
jwax samples/demo.json

# With options
jwax --query "SELECT * FROM users" samples/demo.json
```

### Global Install (from npm)

```bash
npm install -g jwax
jwax data.json
```

## Command-Line Options

```
Usage: jwax [options] <source>

Arguments:
  source                JSON file path, URL, or - for stdin

Options:
  -q, --query <sql>     Run a single query and exit (non-interactive)
  -t, --timeout <sec>   URL fetch timeout in seconds (default: 5)
  -i, --interactive     Force interactive mode with piped input
  --table-name <name>   Custom table name for piped/URL data
  --strict-schema       Enable strict schema validation
  --output-format <fmt> Output format: table (default) or json
  -h, --help            Show help
  -V, --version         Show version
```

## Input Sources

### Local File

```bash
jwax data.json
jwax path/to/nested/file.json
```

### URL

```bash
jwax https://api.example.com/data.json
jwax --timeout 10 https://api.example.com/data.json
```

### stdin (Piped Data)

```bash
# Pipe from curl
curl https://api.example.com/users | jwax --query "SELECT * FROM data"

# Pipe from cat
cat data.json | jwax --query "SELECT name FROM data WHERE age > 25"

# Force interactive mode with piped data
cat data.json | jwax -i

# Custom table name
curl https://api.example.com/users | jwax --table-name users --query "SELECT * FROM users"
```

## Interactive Commands

| Command | Description |
|---------|-------------|
| `:help` | Show help and SQL syntax |
| `:ml` | Toggle multiline input mode |
| `:tables` | List all discovered tables |
| `:schema [table]` | Show schema (all tables or specific) |
| `:quit` / `:exit` | Exit the REPL |

## Testing

### Run CLI Tests

```bash
cd packages/cli
npm test
```

This runs 29 CLI-specific tests (terminal, autocomplete, REPL behavior).

### Run All Tests

```bash
npm test    # from root — runs core (205) + cli (29) + vscode (31) tests
```

## Architecture

```
packages/cli/
├── src/
│   ├── cli.ts                              # CLI bootstrap and commander setup
│   └── terminal/
│       ├── interface.ts                    # Abstract terminal interface
│       └── readline-terminal.ts            # Readline-based REPL implementation
├── test/
│   ├── cli.test.ts                         # CLI integration tests
│   └── terminal/
│       └── readline-terminal.test.ts       # Terminal unit tests
├── bin/
│   └── jwax.ts                        # Entry point
├── package.json
├── tsconfig.json
└── jest.config.js
```

The CLI depends on `@jwax/core` for all SQL logic (schema discovery, data transformation, query execution). The terminal layer uses an adapter pattern so the REPL implementation can be swapped without changing core logic.

## Packaging for Distribution

### npm Package

```bash
# Build
npm run build

# Pack (creates tarball)
cd packages/cli
npm pack

# Publish (when ready)
npm publish
```

### Standalone Binary

```bash
# Install pkg
npm install -g pkg

# Build first
npm run build

# Create executable
cd packages/cli
pkg . -t node18 -o jwax
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/core/package.json packages/core/
COPY packages/cli/package.json packages/cli/
RUN npm ci --production
COPY packages/core/dist packages/core/dist
COPY packages/cli/dist packages/cli/dist
COPY bin ./bin
ENTRYPOINT ["node", "bin/jwax.js"]
```

```bash
docker build -t jwax .
docker run -v $(pwd)/samples:/data jwax /data/demo.json
```
