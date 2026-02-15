# jwax - VS Code Extension

Query JSON files with full SQL syntax directly from VS Code.

## Features

Open any JSON file in VS Code, then use the Command Palette to run SQL queries against it.

### Commands

| Command | Description |
|---------|-------------|
| `jwax: Run SQL Query` | Enter a SQL query and see results in the Output panel |
| `jwax: Show Tables` | List all tables discovered from the JSON file |
| `jwax: Show Schema` | Show column names and types for all tables |

### How It Works

1. Open a `.json` file in VS Code
2. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
3. Type `jwax` and select a command
4. For queries, type your SQL and press Enter
5. Results appear in the **jwax** Output Channel

### JSON to SQL Mapping

- **Top-level arrays** become database tables
- **Nested objects** become related tables (e.g., `users_address`)
- **Synthetic IDs** — All tables get `_id` primary key and nested tables get `_parent_id` foreign key

### Example

Given this JSON:
```json
{
  "users": [
    { "id": 1, "name": "Alice", "address": { "city": "NYC" } }
  ]
}
```

You can query:
```sql
SELECT u.name, a.city
FROM users u
JOIN users_address a ON u._id = a._parent_id
```

## Requirements

- VS Code 1.85.0 or later
- Node.js 18 or later

## Development

```bash
# From the repository root
npm install
npm run build

# Run extension in development
# Press F5 in VS Code with this workspace open
```
