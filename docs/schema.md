# Schema Validation Modes

jwax supports two schema modes to handle different JSON data patterns: **Lenient Mode** (default) and **Strict Mode**.

## Lenient Mode (Default)

By default, all columns are nullable, making it ideal for real-world JSON with inconsistent structures:

```bash
jwax data.json
```

### When to Use Lenient Mode

- Objects in arrays have different fields
- Some fields are optional across records
- Working with messy or unpredictable data
- Maximum flexibility is needed

### Example

Consider this JSON where objects have varying fields:

```json
{
  "users": [
    { "id": 1, "name": "Alice", "email": "alice@example.com", "phone": "555-0001" },
    { "id": 2, "name": "Bob", "email": "bob@example.com" },
    { "id": 3, "name": "Charlie", "phone": "555-0003" }
  ]
}
```

In lenient mode:
- `id` → NULLABLE
- `name` → NULLABLE
- `email` → NULLABLE
- `phone` → NULLABLE

All columns can be NULL because some records are missing them. This allows you to query without worrying about schema enforcement.

## Strict Mode

Enable strict schema validation with the `--strict-schema` flag:

```bash
jwax --strict-schema data.json
```

### Behavior

- Fields present in **ALL** objects become NOT NULL
- Fields missing in **ANY** object remain NULLABLE
- Enforces data consistency
- Catches missing required fields early

### Example 1: All Fields Present

```json
{
  "users": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" },
    { "id": 2, "name": "Bob", "email": "bob@example.com" }
  ]
}
```

With `--strict-schema`:
- `id` → NOT NULL (present in all records)
- `name` → NOT NULL (present in all records)
- `email` → NOT NULL (present in all records)

### Example 2: Some Fields Missing

```json
{
  "users": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" },
    { "id": 2, "name": "Bob" }
  ]
}
```

With `--strict-schema`:
- `id` → NOT NULL (present in all records)
- `name` → NOT NULL (present in all records)
- `email` → NULLABLE (missing in second record)

### Example 3: Varying Fields

```json
{
  "users": [
    { "id": 1, "name": "Alice", "email": "alice@example.com", "phone": "555-0001" },
    { "id": 2, "name": "Bob", "email": "bob@example.com" },
    { "id": 3, "name": "Charlie", "phone": "555-0003" }
  ]
}
```

With `--strict-schema`:
- `id` → NOT NULL (present in all records)
- `name` → NOT NULL (present in all records)
- `email` → NULLABLE (missing in third record)
- `phone` → NULLABLE (missing in first two records)

## Choosing Between Modes

| Scenario | Mode | Reason |
|----------|------|--------|
| Real-world APIs with inconsistent data | Lenient | Handles variations gracefully |
| Curated datasets with guaranteed fields | Strict | Enforces data quality |
| During development with messy data | Lenient | Fewer constraints to debug around |
| For production data pipelines | Strict | Catches data issues early |
| APIs that sometimes omit optional fields | Lenient | Prevents NOT NULL violations |
| Well-structured internal datasets | Strict | Better validation and error detection |

## Combining with Other Options

Schema mode can be combined with other options:

```bash
# Strict schema with query
jwax --strict-schema --query "SELECT * FROM users WHERE id IS NOT NULL" data.json

# Strict schema with URL and timeout
jwax --strict-schema --timeout 15 https://api.example.com/users.json

# Lenient mode (default) with just a query
jwax --query "SELECT * FROM users" data.json
```
