<div align="center">
  <img src="https://raw.githubusercontent.com/squadronleader/jwax/main/docs/assets/logo-jwax.png" alt="JWAX Logo" width="360">
</div>

<div align="center">

# The missing JSON to SQL tool

</div>

Query JSON files with SQL from your terminal.

## Changelog

See [change.md](./change.md) for release notes.

## Install

```bash
npm install -g @squadronleader/jwax
```

## Usage

```bash
jwax --query "SELECT * FROM users LIMIT 5" data.json
```

Output:
```
┌─────┬──────┬────────┐
│ id  │ name │ status │
├─────┼──────┼────────┤
│ 1   │ Alice│ active │
│ 2   │ Bob  │ active │
└─────┴──────┴────────┘
```

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
- **VS Code Extension** - (Coming soon) Query JSON files directly from your editor via the command palette

## Documentation

For full docs and examples, see the project README:
https://github.com/squadronleader/jwax#readme

## Command-Line Options

```bash
jwax [OPTIONS] [source]
```

**Source** can be:
- Path to a JSON file (e.g., `data.json`)
- HTTP/HTTPS URL (e.g., `https://api.example.com/data.json`)
- `-` for explicit stdin, or omit entirely to read from stdin when piped

### Available Options

| Option | Description | Example |
|--------|-------------|---------|
| `--query <sql>` | Execute a single SQL query and output results as JSON (non-interactive mode) | `jwax data.json --query "SELECT * FROM users"` |
| `-i, --interactive` | Force interactive mode when reading from stdin | `cat data.json \| jwax -i` |
| `--table-name <name>` | Override the default table name for top-level JSON arrays | `jwax data.json --table-name users` |
| `--strict-schema` | Enable strict schema validation with NOT NULL constraints on always-present fields | `jwax --strict-schema data.json` |
| `--timeout <seconds>` | Set timeout for loading JSON from URLs (default: 5 seconds) | `jwax --timeout 10 https://example.com/data.json` |
| `--output-format <format>` | Set output format for query results in interactive mode (table or json) | `jwax --output-format json data.json` |
| `--engine <mode>` | Select SQL engine mode (`auto`, `native`, `wasm`) | `jwax --engine wasm data.json` |

`auto` (default) tries native SQLite first and silently falls back to `wasm` when native is unavailable.

## Interactive Mode

Start the REPL with a JSON file:

```bash
jwax samples/demo.json
```

Once started, you can:
- Enter SQL queries directly
- Use special commands (`:help`, `:tables`, `:schema`, `:quit`)
- Leverage tab completion and inline hints
- View results as ASCII tables (or JSON with `--output-format json`)

### Interactive Commands

- `:help` - Show help and SQL syntax
- `:ml` - Toggle between single-line and multiline mode
- `:tables` - List all available tables
- `:schema` - Show schema for all tables
- `:schema <table>` - Show schema for specific table
- `:quit` or `:exit` - Exit the CLI

### Multiline Input Mode

Use `:ml` to toggle multiline mode for writing complex queries across multiple lines:

### Autocomplete Features

**Tab Completion**: Press Tab to cycle through table name matches (case-insensitive partial matching)
- Type `us` then Tab → cycles through `users`, `users_address`
- Works in SQL context: `SELECT * FROM or` + Tab → suggests `orders`, `order_items`

## Output Formats

jwax supports two output formats for query results:

### Table Format (Default)

Displays results as ASCII tables:

```bash
jwax data.json
# or
jwax --output-format table data.json
```

Output:
```
┌─────┬──────┬────────┐
│ id  │ name │ status │
├─────┼──────┼────────┤
│ 1   │ Alice│ active │
│ 2   │ Bob  │ active │
└─────┴──────┴────────┘
```

### JSON Format

Displays results as JSON objects:

```bash
jwax --output-format json data.json
```

Output:
```json
[
  { "id": 1, "name": "Alice", "status": "active" },
  { "id": 2, "name": "Bob", "status": "active" }
]
```

## Non-Interactive Mode (Query Execution)

Execute a query and output results as JSON:

```bash
jwax samples/demo.json --query "SELECT * FROM users LIMIT 5"
```

## Loading from URL

Load JSON data from HTTP/HTTPS endpoints:

```bash
# Basic URL loading
jwax https://example.com/api/data.json

# With custom timeout (default: 5 seconds)
jwax --timeout 10 https://example.com/api/data.json

# URL with query
jwax --timeout 15 --query "SELECT * FROM users" https://api.example.com/users.json
```

## Loading from File

Load JSON data from local files:

```bash
# Interactive REPL
jwax path/to/data.json

# Execute query and exit
jwax path/to/data.json --query "SELECT * FROM users"

# With schema validation
jwax --strict-schema path/to/data.json

# Override table name for top-level arrays
jwax data.json --table-name custom_table --query "SELECT * FROM custom_table"
```

## Loading from Stdin (Piped Data)

Read JSON data from stdin, perfect for Unix pipelines:

### Non-Interactive Mode (Default for Stdin)

When piping data, you **must** provide the `--query` flag:

```bash
# Pipe from curl
curl https://api.example.com/users | jwax --query "SELECT * FROM data"

# Pipe from cat
cat data.json | jwax --query "SELECT name FROM data WHERE age > 25"

# Chain with other tools
echo '[{"id": 1, "name": "Alice"}]' | jwax --query "SELECT * FROM data"

# Explicit stdin with -
jwax - --query "SELECT * FROM data" < input.json

# Custom table name for piped data
curl https://api.example.com/users | jwax --table-name users --query "SELECT COUNT(*) FROM users"
```

### Interactive Mode with Stdin

Force interactive REPL after loading from stdin:

```bash
# Wait for EOF, then start REPL
cat large-dataset.json | jwax -i

# Or with --interactive flag
curl https://api.example.com/users | jwax --interactive
```






