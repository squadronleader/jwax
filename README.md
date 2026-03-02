<div align="center">
  <img src="docs/assets/logo-jwax.png" alt="JWAX Logo" width="360">
</div>

<div align="center">

# The missing JSON to SQL tool

</div>

>   
> 
> **Admit it.**
> 
> You don't want a new DSL.
> 
> You want SQL.
> 
> JWAX loads JSON and lets you query it with the same SQL you were writing back when terminals were green and joins actually meant something.
> 
> **No reinvention.**  
> **No abstraction layers.**
> 
> Query it like you mean it.

## Features

- **Load any JSON file, URL, or stdin** - Automatically discovers tables from JSON arrays
- **Interactive REPL** - Query with `jwax>` prompt and smart autocomplete
- **Multiline Input Mode** - Write queries across multiple lines with `:ml` toggle
- **Full SQL Support** - SELECT, WHERE, ORDER BY, GROUP BY, JOIN, aggregations, subqueries
- **Automatic Schema Discovery** - Arrays become tables, nested objects become related tables
- **Smart Name Handling** - Automatically sanitizes JSON keys to valid SQL names
- **Two Schema Modes** - Lenient (default) for flexible data, strict for validation
- **ASCII Table Output** - Pretty-printed results
- **Unix Pipeline Friendly** - Pipe JSON data from other CLI tools
- **VS Code Extension** - Query JSON files directly from your editor via the command palette

## Installation

### CLI Tool

```bash
# From npm
npm install -g @squadronleader/jwax

# Local development
git clone https://github.com/squadronleader/jwax
cd jwax
npm install
npm run build
```

### VS Code Extension

Install from the VS Code Marketplace (Coming Soon), or run in development mode:

1. Clone and build the repo (see above)
2. Open the repo in VS Code
3. Press **F5** to launch the Extension Development Host
4. Open any `.json` file and use `Cmd+Shift+P` → `jwax`

See the [VS Code Extension Guide](docs/vscode-extension.md) for full details.

## Quick Start

### Interactive Mode

```bash
jwax samples/demo.json
```

Then query with SQL:

```
jwax> SELECT * FROM users
jwax> SELECT name, age FROM users WHERE age > 25 ORDER BY age DESC
jwax> :tables
jwax> :quit
```

### Non-Interactive Mode (Query & Exit)

```bash
jwax data.json --query "SELECT * FROM users LIMIT 5"
```

### Load from URL

```bash
jwax https://api.example.com/data.json
jwax --timeout 10 https://api.example.com/data.json
```

### Load from stdin (Piped Data)

**Non-interactive mode** (default for piped data):
```bash
# Pipe from curl
curl https://api.example.com/users | jwax --query "SELECT * FROM data"

# Pipe from cat
cat data.json | jwax --query "SELECT name FROM data WHERE age > 25"

# Explicit stdin with -
echo '[{"id": 1, "name": "Alice"}]' | jwax - --query "SELECT * FROM data"

# Custom table name for piped data
curl https://api.example.com/users | jwax --table-name users --query "SELECT * FROM users"
```

**Interactive mode** with piped data:
```bash
# Force interactive REPL after loading stdin
cat data.json | jwax -i

# Or explicitly
curl https://api.example.com/users | jwax --interactive
```

## Interactive Commands

| Command | Purpose |
|---------|---------|
| `:help` | Show help and SQL syntax |
| `:ml` | Toggle between single-line and multiline mode |
| `:tables` | List all available tables |
| `:schema [table]` | Show schema for all tables or specific table |
| `:quit` or `:exit` | Exit the REPL |

## 📚 Documentation

For detailed guides and advanced usage:

- **[Getting Started](docs/getting-started.md)** - Setup and first steps (CLI & VS Code)
- **[CLI Guide](docs/cli.md)** - Building, packaging, and running the CLI tool
- **[VS Code Extension Guide](docs/vscode-extension.md)** - Building, packaging, and running the extension
- **[Usage Guide](docs/USAGE.md)** - Command-line options (including `--output-format`), modes, and examples
- **[Schema Validation](docs/SCHEMA.md)** - Lenient vs strict mode explained
- **[Development & Testing](docs/DEVELOPMENT.md)** - Building, testing, debugging
- **[Advanced Features](docs/ADVANCED.md)** - Complex queries, name sanitization, architecture
- **[Architecture](docs/architecture-review.md)** - Internal design and module structure
- **[Future Features](docs/future-features.md)** - Roadmap and planned improvements

## Basic SQL Examples

```sql
-- Select all users
SELECT * FROM users

-- Filter and sort
SELECT name, age FROM users WHERE age > 25 ORDER BY age DESC

-- Join nested objects
SELECT u.name, a.city 
FROM users u 
JOIN users_address a ON u._id = a._pid

-- Aggregations
SELECT status, COUNT(*) as count, SUM(total) as revenue 
FROM orders 
GROUP BY status
```

## How It Works

1. **Schema Discovery** - Analyzes JSON and identifies arrays as tables
2. **Name Sanitization** - Converts JSON keys to valid SQL identifiers
3. **Data Transformation** - Flattens nested JSON with synthetic PKs/FKs
4. **SQL Engine** - Creates in-memory SQLite tables
5. **Query Execution** - Runs SQL queries using SQLite

See [Advanced Features](docs/ADVANCED.md) for detailed pipeline explanation.

## Development

This project is a monorepo with three packages:

| Package | Description |
|---------|-------------|
| `packages/core` | Shared library (orchestrator, engine, schema, transform) |
| `packages/cli` | CLI tool (terminal REPL, commander entry point) |
| `packages/vscode` | VS Code extension |

```bash
npm install                              # Install all dependencies
npm run build                            # Build all packages
npm test                                 # Run all tests
npm run dev -- samples/demo.json         # Run CLI in development mode
```

See [Development & Testing](docs/DEVELOPMENT.md) for complete build and test documentation.

## Examples

See `samples/` directory for example JSON files.

## License

MIT
