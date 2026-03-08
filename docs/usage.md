# Usage Guide

Complete guide to using jwax on the command line and in interactive mode.

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
| `-ijc, --include-json-column` | Include `_json` column on root tables (disabled by default) for SQLite JSON operators | `jwax -ijc events.json` |

`auto` (default) tries native SQLite first and silently falls back to `wasm` when native is unavailable.

### Combining Options

All options can be combined:

```bash
# Query with strict schema
jwax --strict-schema --query "SELECT COUNT(*) FROM users" data.json

# Load from URL with timeout and query
jwax --timeout 10 --query "SELECT * FROM users LIMIT 5" https://api.example.com/data.json

# Interactive mode with JSON output
jwax --output-format json data.json

# All options together
jwax --strict-schema --timeout 10 --output-format json --query "SELECT * FROM items" https://api.example.com/data.json
```

### Optional `_json` Column (Hybrid JSON Querying)

You can enable `_json` column. This is a special column added to only parent tables (tables that have no parent). This will include a raw copy of the json object that represents that object. This can then be used to query the json structure directly. This can be handy if you want select random deep bits of info without explicitly having write joins. By default, `_json` is disabled so `SELECT *` on root tables stays compact.  
Enable it only when you want direct nested access with SQLite JSON operators:

```bash
jwax --include-json-column events.json
```

```sql
SELECT id, _json ->> '$.metadata.device.os' AS device_os
FROM events
WHERE type = 'purchase';
```

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

**Single-Line Mode** (default - `[SL]` indicator):
- Queries execute immediately
- No need for semicolons
- Fastest for simple queries

**Multiline Mode** (`[ML]` indicator):
- Type query across multiple lines
- Press Enter to continue to the next line
- Query accumulates until terminated with `;`
- Continuation prompt `...>` shows you're still in query entry
- Useful for complex queries with multiple clauses

**Example:**

```
jwax> [SL] :ml
Mode switched to: MULTILINE

jwax> [ML] SELECT u.name, COUNT(o._id) as order_count
...> FROM users u
...> LEFT JOIN orders o ON u._id = o.user_id
...> GROUP BY u._id, u.name
...> ORDER BY order_count DESC;

┌───────┬─────────────┐
│ name  │ order_count │
├───────┼─────────────┤
│ Alice │ 5           │
│ Bob   │ 3           │
└───────┴─────────────┘

jwax> [ML] :ml
Mode switched to: SINGLE-LINE

jwax> [SL]
```

**Buffer Management:**
- Incomplete queries are discarded when toggling `:ml` (with warning)
- Buffer automatically clears after query execution
- Each `:ml` toggle starts fresh for next query

### Autocomplete Features

**Tab Completion**: Press Tab to cycle through table name matches (case-insensitive partial matching)
- Type `us` then Tab → cycles through `users`, `u_address`
- Works in SQL context: `SELECT * FROM or` + Tab → suggests `orders`, `order_items`

**Inline Hints**: Grey suggestions appear as you type, showing the best matching table
- Type `us` → see `users` suggested in grey
- Press Right Arrow or End to accept the hint
- Hints update in real-time as you type
- Only shows prefix matches (tables starting with what you typed)

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

**Use JSON format when:**
- Piping output to other JSON tools like `jq`
- Integrating with scripts and automation
- Storing results in a file for processing
- Working in non-interactive mode

## Non-Interactive Mode (Query Execution)

Execute a query and output results as JSON:

```bash
jwax samples/demo.json --query "SELECT * FROM users LIMIT 5"
```

### Output Format

- Results are returned as a JSON array of objects
- Each row becomes an object with column names as keys
- Nested objects are reconstructed from related tables
- Synthetic columns (`_id`, `_pid`) are excluded
- Perfect for piping to other tools like `jq`

### Examples

```bash
# Basic query
jwax data.json --query "SELECT name, age FROM users WHERE age > 25"

# Pipe to jq for filtering
jwax data.json --query "SELECT * FROM users" | jq '.[] | select(.age > 30)'

# Save to file
jwax data.json --query "SELECT * FROM orders" > output.json

# Use with other command-line tools
jwax data.json --query "SELECT name FROM users" | jq -r '.[] | .name'
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

### Timeout Behavior

- Default timeout is 5 seconds for URL requests
- Use `--timeout <seconds>` to increase for slow APIs
- Applies to initial connection and response time
- Shows progress indicator: "Fetching..." with animated dots

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

### Table Naming for Stdin

- Default table name for stdin: `data`
- Override with `--table-name <name>`
- Only applies to top-level JSON arrays
- Example: `cat array.json | jwax --table-name items --query "SELECT * FROM items"`

## JSON Structure

The tool expects JSON with arrays that will be treated as tables:

```json
{
  "users": [
    { "id": 1, "name": "Alice" }
  ],
  "orders": [
    { "id": 101, "total": 99.99 }
  ]
}
```

- Each top-level array becomes a table
- Nested objects become related tables with `_pid` foreign keys
- All tables get a synthetic `_id` primary key

### Direct Array Support

If the JSON is a direct array like `[{...}, {...}]`, it will automatically be wrapped with a table name derived from the filename or URL path (e.g., `users.json` becomes table `users`, or `/api/users` becomes table `users`).

## Testing Locally (Before Publishing to npm)

To test the package locally as if installed from npm:

```bash
# Build the project
npm run build

# Create a tarball
npm pack

# Install globally from the tarball
npm install -g ./jwax-1.0.0.tgz

# Now you can use jwax command anywhere
jwax path/to/your/data.json
```
