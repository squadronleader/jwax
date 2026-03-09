# Advanced Features & SQL Guide

Advanced usage patterns, complex queries, and how jwax works internally.

## SQL Examples

### Basic Queries

```sql
-- Select all users
SELECT * FROM users

-- Filter and sort
SELECT name, age FROM users WHERE age > 25 ORDER BY age DESC

-- Count records
SELECT COUNT(*) FROM orders
```

### Joins (Nested Objects)

JSON with nested structure:

```json
{
  "users": [
    {
      "id": 1,
      "name": "Alice",
      "address": {
        "city": "NYC",
        "zip": "10001"
      }
    }
  ]
}
```

This automatically creates two tables: `users` and `users_address` with foreign key relationships.

Query nested data:

```sql
SELECT u.name, a.city 
FROM users u 
JOIN users_address a ON u._id = a._pid
```

### Aggregations

```sql
-- Group by with aggregations
SELECT status, COUNT(*) as count, SUM(total) as revenue 
FROM orders 
GROUP BY status

-- Average age by city
SELECT city, AVG(age) as avg_age 
FROM users 
GROUP BY city

-- Multiple aggregations
SELECT 
  department,
  COUNT(*) as count,
  AVG(salary) as avg_salary,
  MIN(salary) as min_salary,
  MAX(salary) as max_salary
FROM employees
GROUP BY department
```

### Complex Queries

```sql
-- Subqueries
SELECT * FROM users 
WHERE age > (SELECT AVG(age) FROM users)

-- Multiple joins with nested objects
SELECT c.name, d.name, e.name
FROM company c
JOIN company_departments d ON c._id = d._pid
JOIN departments_employees e ON d._id = e._pid

-- Filtering after aggregation
SELECT status, COUNT(*) as count
FROM orders
GROUP BY status
HAVING count > 5

-- LIMIT and OFFSET
SELECT * FROM users ORDER BY age DESC LIMIT 10 OFFSET 5
```

## How It Works

jwax transforms JSON into relational SQL through a 5-step pipeline:

1. **Schema Discovery**: Analyzes JSON structure and identifies arrays as tables
2. **Name Sanitization**: Converts JSON keys to valid SQL identifiers
3. **Data Transformation**: Flattens nested JSON into relational rows with synthetic PKs/FKs
4. **SQL Engine**: Creates tables in an in-memory SQLite database
5. **Query Execution**: Runs your SQL queries using SQLite's query engine

### JSON to Table Mapping

- **Top-level arrays** → become database tables
- **Nested objects** → become related tables using parent+child names, expanding ancestry on collisions (e.g., `users.address` → `users_address`)
- **Synthetic IDs** → All tables get `_id` primary key (UUID)
- **Foreign Keys** → Nested objects get `_parent_id` referencing parent table's `_id`

#### Example

```json
{
  "users": [
    {
      "id": 1,
      "name": "Alice",
      "address": { "city": "NYC", "zip": "10001" }
    }
  ]
}
```

Creates two tables:
- **users** with columns: `_id`, `id`, `name`
- **users_address** with columns: `_id`, `_parent_id`, `city`, `zip`

## Automatic Name Sanitization

jwax automatically converts **any** JSON key into valid SQL table and column names. This means you can query JSON with unconventional key names without errors.

### Sanitization Rules

1. **Special characters** → replaced with underscores
2. **Names starting with numbers** → prefixed with `_`
3. **Consecutive underscores** → collapsed to single underscore
4. **Everything lowercase** → for consistency

### Examples

| JSON Key | SQL Table/Column |
|----------|------------------|
| `"user-list"` | `user_list` |
| `"api.v2.users"` | `api_v2_users` |
| `"items@2024"` | `items_2024` |
| `"my data"` | `my_data` |
| `"2024-orders"` | `_2024_orders` |
| `"path/to/data"` | `path_to_data` |
| `"@#$%"` | `table_data` (fallback) |

### Finding Sanitized Names

Use the `:tables` command to see what table names were created from your JSON:

```
jwax> :tables
Available tables:
  - user_list
  - api_v2_users
  - items_2024
```

Or use `:schema` to see both table and column names:

```
jwax> :schema user_list

Table: user_list
Columns:
  _id INTEGER PRIMARY KEY
  id INTEGER
  first_name TEXT
  created_at TEXT
```

### Real-World Example

**Input JSON with problematic names:**

```json
{
  "api/v1/users": [
    {
      "user-id": 1,
      "first-name": "Alice",
      "created@timestamp": "2024-01-01"
    }
  ]
}
```

**Sanitized to:**
- Table: `api_v1_users`
- Columns: `_id`, `user_id`, `first_name`, `created_timestamp`

**Query normally:**

```sql
SELECT user_id, first_name, created_timestamp 
FROM api_v1_users;
```

This happens automatically - no configuration needed! 🎉

## Type Inference

jwax automatically infers SQL data types from your JSON values:

- **INTEGER** - numeric values without decimals
- **REAL** - floating-point numbers
- **TEXT** - strings, booleans (stored as strings), dates

Type inference is lenient by default, allowing NULL values in any column.

## Internal Architecture

For detailed information about the internal architecture, see `docs/architecture-review.md`.

Key modules:
- **SQL Engine** (`src/engine/`) - SQLite adapter and query execution
- **Schema Discovery** (`src/schema/`) - JSON structure analysis
- **Data Transformation** (`src/transform/`) - Flattening and data mapping
- **Orchestrator** (`src/orchestrator.ts`) - Pipeline coordination
- **Terminal Interface** (`src/terminal/`) - REPL with adapter pattern
- **Formatters** (`src/formatter/`) - Output formatting
