# JWAX Documentation

> **Admit it.**
> 
> You don't want a new DSL.
> 
> You want SQL.
> 
> jwax loads JSON and lets you query it with the same SQL you were writing back when terminals were green and joins actually meant something.

## Why jwax?

- **No reinvention** - Full SQL support, no custom query language
- **No abstraction layers** - Direct SQLite under the hood
- **Automatic discovery** - JSON arrays become tables instantly
- **Smart relationships** - Nested objects automatically create related tables
- **Interactive REPL** - Query with syntax highlighting and autocomplete
- **Unix pipeline friendly** - Pipe JSON from any tool

## Quick Start

```bash
# Install the CLI
npm install -g jwax

# Query a JSON file
jwax data.json

# Then use SQL
jwax> SELECT * FROM users
jwax> SELECT name FROM users WHERE age > 25 ORDER BY age DESC
```

## Features

- **Load any JSON file** - Files, URLs, or stdin
- **Interactive REPL** - With smart autocomplete and multiline mode
- **Full SQL Support** - SELECT, WHERE, ORDER BY, GROUP BY, JOIN, aggregations, subqueries
- **Automatic Schema Discovery** - Arrays become tables, nested objects create related tables
- **Smart Name Handling** - Automatically sanitizes JSON keys to valid SQL names
- **Two Schema Modes** - Lenient (default) for flexibility, strict for validation
- **ASCII Table Output** - Beautiful formatted results
- **VS Code Extension** - Query JSON directly from your editor

## Documentation

- **[Getting Started](getting-started.md)** - Installation and setup
- **[Usage Guide](USAGE.md)** - Command-line options and modes
- **[CLI Tool](cli.md)** - Building and running the CLI
- **[VS Code Extension](vscode-extension.md)** - Using the editor extension
- **[Schema & Validation](SCHEMA.md)** - Understanding lenient vs strict mode
- **[How It Works](structure.md)** - The architecture and pipeline
- **[Architecture](architecture-review.md)** - Deep dive into internal design
- **[Advanced Features](ADVANCED.md)** - Complex queries and features
- **[Development](DEVELOPMENT.md)** - Building and testing

## Example

```json
{
  "users": [
    {
      "id": 1,
      "name": "Alice",
      "email": "alice@example.com",
      "address": {
        "city": "New York",
        "zip": "10001"
      }
    }
  ]
}
```

```sql
-- Simple query
SELECT name, email FROM users;

-- Join nested data
SELECT u.name, a.city 
FROM users u 
JOIN users_address a ON u._id = a._parent_id;

-- Aggregations
SELECT COUNT(*) as total_users FROM users;
```

## License

MIT License - See LICENSE file for details.
