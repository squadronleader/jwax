# Getting Started with jwax

A step-by-step guide to querying JSON files with SQL — via the CLI or VS Code.

## Table of Contents

- [Quick Start — CLI](#quick-start--cli)
- [Quick Start — VS Code Extension](#quick-start--vs-code-extension)
- [Understanding the Basics](#understanding-the-basics)
- [Interactive Commands](#interactive-commands)
- [Writing SQL Queries](#writing-sql-queries)
- [Working with Nested Data](#working-with-nested-data)
- [Advanced Queries](#advanced-queries)
- [Common Patterns](#common-patterns)

## Quick Start — CLI

### 1. Install and Run

**With a local JSON file:**
```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run with a JSON file
npm run dev -- samples/demo.json
```

**With a JSON URL:**
```bash
npm run dev -- https://example.com/api/data.json
```

You'll see:
```
Loaded samples/demo.json. Discovered 3 table(s).
Enter SQL queries (type :help for commands, :quit to exit).

jwax>
```

### 2. Your First Query

```sql
jwax> SELECT * FROM users
```

Output:
```
┌─────┬────┬─────────┬─────┬───────────────────────┐
│ _id │ id │ name    │ age │ email                 │
├─────┼────┼─────────┼─────┼───────────────────────┤
│ 1   │ 1  │ Alice   │ 30  │ alice@example.com     │
├─────┼────┼─────────┼─────┼───────────────────────┤
│ 2   │ 2  │ Bob     │ 25  │ bob@example.com       │
├─────┼────┼─────────┼─────┼───────────────────────┤
│ 3   │ 3  │ Charlie │ 35  │ charlie@example.com   │
└─────┴────┴─────────┴─────┴───────────────────────┘
```

That's it! You're querying JSON with SQL.

## Quick Start — VS Code Extension

### 1. Build the Extension

```bash
git clone https://github.com/squadronleader/jwax
cd jwax
npm install
npm run build
```

### 2. Launch the Extension

- Open the repo in VS Code
- Press **F5** to launch the Extension Development Host
- A new VS Code window opens with the extension loaded

### 3. Query a JSON File

1. Open any `.json` file in the Extension Development Host window
2. Press **Cmd+Shift+P** (or **Ctrl+Shift+P** on Windows/Linux)
3. Type `jwax` and select **jwax: Run SQL Query**
4. Enter a SQL query (e.g. `SELECT * FROM users`)
5. Results appear in the **jwax** Output Channel

### Available Commands

| Command | What it does |
|---------|-------------|
| **jwax: Run SQL Query** | Enter SQL, see results in Output panel |
| **jwax: Show Tables** | List all tables discovered from the JSON |
| **jwax: Show Schema** | Show column names and types for all tables |

See the [VS Code Extension Guide](vscode-extension.md) for building, packaging, and advanced usage.

## Understanding the Basics

### How JSON Becomes Tables

**JSON Structure:**
```json
{
  "users": [
    { "id": 1, "name": "Alice", "age": 30 }
  ],
  "orders": [
    { "id": 101, "total": 99.99 }
  ]
}
```

**Becomes Tables:**
- `users` table with columns: `_id`, `id`, `name`, `age`
- `orders` table with columns: `_id`, `id`, `total`

**Direct Array Support:** If the JSON is a direct array like `[{...}, {...}]`, it will automatically be wrapped with a table name derived from the filename or URL path (e.g., `users.json` → table `users`, `/api/users` → table `users`).

### Automatic Name Sanitization

jwax automatically fixes JSON keys that aren't valid SQL identifiers. This means you can work with real-world JSON that has spaces, special characters, or starts with numbers.

**Sanitization Rules:**

| Issue | Fix | Example |
|-------|-----|---------|
| Special characters | → underscores | `"user-list"` → `user_list` |
| Starts with number | → prefix with `_` | `"2024data"` → `_2024data` |
| Spaces | → underscores | `"my data"` → `my_data` |
| Dots/slashes | → underscores | `"api/v1"` → `api_v1` |
| Mixed case | → lowercase | `"UserList"` → `userlist` |

**Example with problematic names:**

```json
{
  "user-list": [
    {
      "first-name": "Alice",
      "created@2024": "2024-01-01"
    }
  ]
}
```

**Automatically becomes:**
- Table: `user_list`
- Columns: `_id`, `first_name`, `created_2024`

**Query it normally:**
```sql
SELECT first_name, created_2024 FROM user_list;
```

**Pro Tip:** Use `:tables` and `:schema` commands to see the sanitized names:
```
jwax> :tables
Available tables:
  - user_list

jwax> :schema user_list
Table: user_list
Columns:
  _id INTEGER PRIMARY KEY
  first_name TEXT
  created_2024 TEXT
```

### Key Concepts

1. **Arrays become tables**: Every JSON array at any level becomes a SQL table
2. **Synthetic Primary Keys**: Every table gets a `_id` column (1, 2, 3...)
3. **Type Inference**: Numbers → INTEGER/REAL, strings → TEXT, booleans → INTEGER (0/1)
4. **Nested Objects**: Create related tables with `_pid` foreign keys

## Interactive Commands

These special commands help you explore your data:

### `:tables` - List All Tables

```
jwax> :tables

Available tables:
  - users
  - users_address
  - orders
```

Use this to see what tables were discovered from your JSON.

### `:schema` - View Table Structure

**All tables:**
```
jwax> :schema
```

**Specific table:**
```
jwax> :schema users

Table: users
Columns:
  _id INTEGER PRIMARY KEY
  id INTEGER NOT NULL
  name TEXT NOT NULL
  age INTEGER NOT NULL
  email TEXT NOT NULL
```

This shows you what columns are available and their types.

### `:help` - Show Help

```
jwax> :help
```

Displays available commands and SQL examples.

### `:quit` or `:exit` - Exit the CLI

```
jwax> :quit
Goodbye.
```

## Writing SQL Queries

### Basic SELECT Queries

**Select all columns:**
```sql
SELECT * FROM users
```

**Select specific columns:**
```sql
SELECT name, age FROM users
```

**With aliases:**
```sql
SELECT name AS user_name, age AS user_age FROM users
```

### Filtering with WHERE

**Exact match:**
```sql
SELECT * FROM users WHERE age = 30
```

**Comparison operators:**
```sql
SELECT * FROM users WHERE age > 25
SELECT * FROM users WHERE age >= 30
SELECT * FROM users WHERE age < 35
SELECT * FROM orders WHERE total >= 100.00
```

**Text matching:**
```sql
SELECT * FROM users WHERE name = 'Alice'
SELECT * FROM users WHERE email LIKE '%@example.com'
SELECT * FROM users WHERE name LIKE 'A%'  -- Starts with 'A'
```

**Multiple conditions:**
```sql
SELECT * FROM users WHERE age > 25 AND age < 35
SELECT * FROM users WHERE name = 'Alice' OR name = 'Bob'
SELECT * FROM users WHERE age IN (25, 30, 35)
```

### Sorting Results

**Ascending order (default):**
```sql
SELECT * FROM users ORDER BY age
SELECT * FROM users ORDER BY age ASC
```

**Descending order:**
```sql
SELECT * FROM users ORDER BY age DESC
```

**Multiple columns:**
```sql
SELECT * FROM orders ORDER BY status, total DESC
```

### Limiting Results

**First N rows:**
```sql
SELECT * FROM users LIMIT 5
```

**Pagination (skip and limit):**
```sql
SELECT * FROM users LIMIT 10 OFFSET 20  -- Skip 20, take 10
```

### Aggregations

**Count records:**
```sql
SELECT COUNT(*) FROM users
SELECT COUNT(*) as total_users FROM users
```

**Sum, Average, Min, Max:**
```sql
SELECT SUM(total) as revenue FROM orders
SELECT AVG(age) as average_age FROM users
SELECT MIN(age) as youngest FROM users
SELECT MAX(age) as oldest FROM users
```

**Group by:**
```sql
SELECT status, COUNT(*) as count 
FROM orders 
GROUP BY status
```

**Group by with multiple aggregations:**
```sql
SELECT 
  status,
  COUNT(*) as order_count,
  SUM(total) as total_revenue,
  AVG(total) as avg_order_value
FROM orders
GROUP BY status
```

**Having clause (filter groups):**
```sql
SELECT status, COUNT(*) as count
FROM orders
GROUP BY status
HAVING COUNT(*) > 5
```

## Working with Nested Data

When your JSON has nested objects, jwax creates related tables with foreign keys.

### Understanding Nested Structure

**JSON:**
```json
{
  "users": [
    {
      "id": 1,
      "name": "Alice",
      "address": {
        "city": "New York",
        "zip": "10001"
      }
    }
  ]
}
```

**Creates Two Tables:**

1. **`users`** table:
   - `_id` (1, 2, 3...)
   - `id`, `name`

2. **`users_address`** table:
   - `_id` (1, 2, 3...)
   - `_pid` (links to users._id)
   - `city`, `zip`

### Joining Tables

**Basic JOIN:**
```sql
SELECT 
  u.name,
  a.city,
  a.zip
FROM users u
JOIN users_address a ON u._id = a._pid
```

**JOIN with WHERE:**
```sql
SELECT u.name, a.city
FROM users u
JOIN users_address a ON u._id = a._pid
WHERE a.city = 'New York'
```

### Multiple Levels of Nesting

**JSON:**
```json
{
  "company": [
    {
      "name": "Acme Corp",
      "departments": [
        {
          "name": "Engineering",
          "employees": [
            { "name": "Alice", "role": "Engineer" }
          ]
        }
      ]
    }
  ]
}
```

**Creates Three Tables:**
- `company`
- `company_departments`
- `company_departments_employees`

**Query all three levels:**
```sql
SELECT 
  c.name as company,
  d.name as department,
  e.name as employee,
  e.role
FROM company c
JOIN company_departments d ON c._id = d._pid
JOIN company_departments_employees e ON d._id = e._pid
```

## Advanced Queries

### Subqueries

**Users older than average:**
```sql
SELECT * FROM users
WHERE age > (SELECT AVG(age) FROM users)
```

**Top customers by order count:**
```sql
SELECT 
  user_id,
  (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count
FROM users u
ORDER BY order_count DESC
LIMIT 10
```

### CASE Statements

**Conditional logic:**
```sql
SELECT 
  name,
  age,
  CASE
    WHEN age < 25 THEN 'Young'
    WHEN age < 35 THEN 'Adult'
    ELSE 'Senior'
  END as age_group
FROM users
```

### Window Functions

**Row numbers:**
```sql
SELECT 
  name,
  age,
  ROW_NUMBER() OVER (ORDER BY age DESC) as rank
FROM users
```

**Running totals:**
```sql
SELECT 
  id,
  total,
  SUM(total) OVER (ORDER BY id) as running_total
FROM orders
```

### Common Table Expressions (CTEs)

**WITH clause:**
```sql
WITH adult_users AS (
  SELECT * FROM users WHERE age >= 18
)
SELECT name, age FROM adult_users ORDER BY age
```

**Multiple CTEs:**
```sql
WITH 
  high_spenders AS (
    SELECT user_id, SUM(total) as lifetime_value
    FROM orders
    GROUP BY user_id
    HAVING SUM(total) > 1000
  ),
  user_details AS (
    SELECT id, name, email FROM users
  )
SELECT 
  u.name,
  u.email,
  h.lifetime_value
FROM user_details u
JOIN high_spenders h ON u.id = h.user_id
```

## Common Patterns

### Pattern 1: Find Top N Items

```sql
-- Top 5 oldest users
SELECT name, age FROM users
ORDER BY age DESC
LIMIT 5

-- Top 10 highest value orders
SELECT * FROM orders
ORDER BY total DESC
LIMIT 10
```

### Pattern 2: Count and Group

```sql
-- Orders per status
SELECT status, COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY count DESC

-- Users per city
SELECT a.city, COUNT(*) as user_count
FROM users u
JOIN users_address a ON u._id = a._pid
GROUP BY a.city
```

### Pattern 3: Filter and Aggregate

```sql
-- Total revenue from completed orders
SELECT SUM(total) as completed_revenue
FROM orders
WHERE status = 'completed'

-- Average age of users in NYC
SELECT AVG(u.age) as avg_age
FROM users u
JOIN users_address a ON u._id = a._pid
WHERE a.city = 'New York'
```

### Pattern 4: Find Missing Relationships

```sql
-- Users without orders
SELECT u.* FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL

-- Orders without matching users
SELECT o.* FROM orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE u.id IS NULL
```

### Pattern 5: Percentile Calculations

```sql
-- Users in top 25% by age
SELECT * FROM users
WHERE age >= (
  SELECT age FROM users
  ORDER BY age DESC
  LIMIT 1 OFFSET (SELECT COUNT(*) / 4 FROM users)
)
```

### Pattern 6: Deduplication

```sql
-- Find duplicate emails
SELECT email, COUNT(*) as count
FROM users
GROUP BY email
HAVING COUNT(*) > 1

-- Get unique values
SELECT DISTINCT city FROM users_address
```

## Tips and Best Practices

### 1. Start with Schema Exploration

Always start by understanding your data:
```sql
:tables           -- What tables exist?
:schema          -- What columns are available?
:schema users    -- Deep dive into specific table
```

### 2. Use Table Aliases

Makes queries more readable:
```sql
-- Good
SELECT u.name, a.city
FROM users u
JOIN users_address a ON u._id = a._pid

-- Less readable
SELECT users.name, users_address.city
FROM users
JOIN users_address ON users._id = users_address._pid
```

### 3. Test Incrementally

Build complex queries step by step:
```sql
-- Step 1: Get base data
SELECT * FROM users

-- Step 2: Add filter
SELECT * FROM users WHERE age > 25

-- Step 3: Add join
SELECT u.*, a.city FROM users u
JOIN users_address a ON u._id = a._pid
WHERE u.age > 25
```

### 4. Use LIMIT During Development

Avoid overwhelming output:
```sql
SELECT * FROM large_table LIMIT 10
```

### 5. Remember the Synthetic Keys

- `_id`: Auto-generated primary key (1, 2, 3...)
- `_pid`: Foreign key linking to parent table's `_id`

These are different from your original `id` fields in the JSON.

### 6. Check Sanitized Names for Special Characters

If your JSON has keys with special characters, check what names were created:
```sql
:tables          -- See all table names
:schema mytable  -- See column names
```

JSON keys are automatically sanitized:
- `"user-list"` → `user_list`
- `"api.users"` → `api_users`
- `"2024data"` → `_2024data`

## Troubleshooting

### "No such table" Error

**Problem:** Table name doesn't exist

**Solution:** Use `:tables` to see available tables. Remember:
- Table names are lowercase
- Special characters are replaced with underscores (e.g., `"user-list"` → `user_list`)
- Names starting with numbers are prefixed with `_` (e.g., `"2024data"` → `_2024data`)
- Nested objects create new tables with underscore separators (e.g., `users.address` → `users_address`)

**Example:**
```
jwax> :tables
Available tables:
  - user_list
  - api_v2_users
  - _2024_orders
```

### "No such column" Error

**Problem:** Column name doesn't exist

**Solution:** Use `:schema <table>` to see available columns. Remember:
- Column names are sanitized the same way as table names
- Special characters become underscores (e.g., `"first-name"` → `first_name`)
- Every table has synthetic `_id` column
- Nested tables have `_pid` column

**Example:**
```
jwax> :schema user_list
Table: user_list
Columns:
  _id INTEGER PRIMARY KEY
  user_id INTEGER
  first_name TEXT
  created_at TEXT
```

### Can't Find My JSON Key

**Problem:** Your JSON has `"user-list"` but the query fails

**Solution:** The key was sanitized. Check `:schema` for the actual name:
```sql
-- Your JSON has "user-list" key
-- Query with sanitized name:
SELECT * FROM user_list;

-- Your JSON has "first-name" column
-- Query with sanitized name:
SELECT first_name FROM user_list;
```

### Empty Results

**Problem:** Query returns no rows

**Solution:** Check your data:
```sql
-- First see what data exists
SELECT * FROM table LIMIT 10

-- Then check your WHERE conditions
SELECT * FROM table WHERE column = 'value'
```

### JOIN Returns No Rows

**Problem:** JOIN produces empty result

**Solution:** Check the foreign key relationship:
```sql
-- Verify parent IDs exist
SELECT _id, _pid FROM child_table LIMIT 10

-- Use LEFT JOIN to see missing matches
SELECT p.*, c.*
FROM parent_table p
LEFT JOIN child_table c ON p._id = c._pid
```

## Next Steps

- Read [Architecture Documentation](architecture-review.md) to understand how it works
- Check out [SQL Engine Comparison](sql-engine-comparison.md) to see why we chose SQLite
- Explore more complex queries using [SQLite documentation](https://www.sqlite.org/lang.html)
- Run the test demos: `test/demo-phase*.ts` to see component examples

## Quick Reference Card

```
╔═══════════════════════════════════════════════════════════╗
║  jwax Quick Reference                                ║
╠═══════════════════════════════════════════════════════════╣
║  LOADING DATA                                             ║
║  npm run dev <file.json>                                  ║
║  npm run dev <url>                                        ║
║  npm run dev -- --timeout 10 <url>                        ║
║  npm run dev -- --strict-schema <file.json>               ║
╠═══════════════════════════════════════════════════════════╣
║  COMMANDS                                                 ║
║  :tables              List all tables                     ║
║  :schema              Show all schemas                    ║
║  :schema <table>      Show specific table schema          ║
║  :help                Show help                           ║
║  :quit                Exit                                ║
╠═══════════════════════════════════════════════════════════╣
║  BASIC QUERIES                                            ║
║  SELECT * FROM table                                      ║
║  SELECT col1, col2 FROM table WHERE col1 > 10             ║
║  SELECT * FROM table ORDER BY col DESC LIMIT 10           ║
╠═══════════════════════════════════════════════════════════╣
║  JOINS (for nested data)                                  ║
║  SELECT p.*, c.*                                          ║
║  FROM parent p                                            ║
║  JOIN parent_child c ON p._id = c._pid                    ║
╠═══════════════════════════════════════════════════════════╣
║  AGGREGATIONS                                             ║
║  SELECT COUNT(*), SUM(col), AVG(col) FROM table           ║
║  SELECT col, COUNT(*) FROM table GROUP BY col             ║
╠═══════════════════════════════════════════════════════════╣
║  KEY COLUMNS                                              ║
║  _id          Auto-generated primary key                  ║
║  _pid         Foreign key to parent table                 ║
╚═══════════════════════════════════════════════════════════╝
```

Happy Querying! 🚀
