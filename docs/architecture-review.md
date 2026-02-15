# Architecture Review: jwax

## Executive Summary

The current implementation is a functional MVP but is **tightly coupled and fragile**. It reinvents SQL parsing/evaluation rather than delegating to a proper SQL engine. To support your goal of leveraging SQL familiarity without reinventing the wheel, the architecture needs a fundamental shift.

**Recommended Approach:** Use an in-memory SQL engine (SQLite or DuckDB) and focus the codebase on **JSON-to-SQL schema mapping**.

---

## Current Architecture Issues

### 1. **Custom SQL Evaluation = Reinventing the Wheel**
**Files:** `evaluator.ts`, `parser.ts`, `selector.ts`

- **Problem:** Manual WHERE clause evaluation (lines 60-128 in evaluator.ts), custom operator handling, array comparison logic
- **Impact:** Adding GROUP BY, ORDER BY, aggregations, JOINs would require extensive custom logic for each feature
- **Fragility:** Edge cases in SQL semantics (NULL handling, type coercion, operator precedence) are partially implemented

### 2. **Tight Coupling Between Layers**
**Files:** `index.ts`, `evaluator.ts`, `selector.ts`

- **Problem:** `runQuery()` mixes path resolution, filtering, and selection in a single function
- **Problem:** `evaluator.ts` imports from `selector.ts` for `getValue()`, `selector.ts` builds headers based on candidates
- **Impact:** Cannot easily swap out JSON resolution strategy or execution engine
- **Fragility:** Changes to one module cascade to others

### 3. **Unclear Separation of Concerns**
**Files:** All modules

- **Problem:** No clear boundaries between:
  - Query parsing (parser.ts does partial work, evaluator.ts does more parsing)
  - Schema discovery (implicit in selector.ts)
  - Data transformation (scattered across jsonPath.ts and selector.ts)
  - Query execution (index.ts + evaluator.ts)

### 4. **Inconsistent JSON Path Handling**
**File:** `jsonPath.ts`

- **Problem:** Uses jsonpath-plus library but falls back to custom logic on errors (lines 13-37)
- **Problem:** Manual array flattening logic duplicated in multiple places
- **Fragility:** FROM path resolution logic would need extension for nested tables

### 5. **No Schema Model**
**Missing:** Schema discovery/mapping layer

- **Problem:** No explicit representation of how JSON maps to tables/columns
- **Impact:** Cannot reason about table relationships, foreign keys, or joins
- **Fragility:** Adding nested table support requires retrofitting schema awareness everywhere

---

## Recommended Architecture

### Core Principle: **Separation of JSON Normalization from SQL Execution**

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                            │
│                      (cli.ts, bin/)                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Query Orchestrator                        │
│  • Load JSON → Discover Schema → Populate DB → Execute SQL  │
└───────┬─────────────────┬───────────────────┬───────────────┘
        │                 │                   │
        ▼                 ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐
│   Schema     │  │    Data      │  │   SQL Engine         │
│  Discovery   │  │ Transformer  │  │  (SQLite/DuckDB)     │
│              │  │              │  │                      │
│ • Walk JSON  │  │ • Flatten    │  │ • Parse SQL          │
│ • Identify   │  │ • Generate   │  │ • Execute queries    │
│   arrays     │  │   PKs/FKs    │  │ • Return results     │
│ • Build      │  │ • Insert     │  │ • ORDER BY, GROUP BY │
│   table map  │  │   rows       │  │ • Aggregations       │
└──────────────┘  └──────────────┘  └──────────────────────┘
```

### Module Responsibilities

#### 1. **Schema Discovery Module** (NEW)
```typescript
interface TableSchema {
  name: string;           // e.g., "users", "users_address"
  path: string[];         // JSON path: ["users"] or ["users", "address"]
  columns: ColumnDef[];
  parentTable?: string;   // for nested objects
  parentKey?: string;     // FK column referencing parent
}

interface ColumnDef {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB';
  nullable: boolean;
}
```

**Responsibilities:**
- Walk JSON structure recursively
- Identify arrays → tables
- Identify nested objects → related tables with FKs
- Infer column types from sample data
- Generate schema map: `Map<tableName, TableSchema>`

#### 2. **Data Transformer Module** (NEW)
**Responsibilities:**
- Take schema + JSON → generate SQL INSERT statements
- Flatten nested structures according to schema
- Generate synthetic PKs/FKs for relationships
- Handle type conversion (dates, nulls, etc.)

#### 3. **SQL Engine Adapter** (NEW)
**Responsibilities:**
- Initialize in-memory database (SQLite or DuckDB)
- Create tables from schema
- Execute INSERT statements
- Execute user queries
- Return results in standardized format

**Implementation Options:**
- **SQLite via better-sqlite3**: Mature, synchronous API, 2MB overhead
- **DuckDB**: Better analytics, columnar storage, slightly heavier (~10MB)
- **sql.js**: Pure JS SQLite (WASM), slower but no native deps

#### 4. **Query Orchestrator** (REFACTOR index.ts)
**Responsibilities:**
- Coordinate the pipeline: Load → Schema → Transform → Query
- Cache the database per session
- Expose simple API: `executeQuery(sqlString): {headers, rows}`

#### 5. **CLI Layer** (MINIMAL CHANGES)
- Keep REPL logic
- Pass user queries directly to orchestrator
- Remove custom parsing/evaluation logic

---

## Migration Path

### Phase 1: Add SQL Engine (No Breaking Changes)
1. Add SQLite/DuckDB dependency
2. Create `SQLEngineAdapter` module
3. Update `runQuery()` to:
   - Discover schema from JSON
   - Populate in-memory DB
   - Execute query via SQL engine
   - Return results (same format as before)
4. Keep existing code as fallback/reference

### Phase 2: Build Schema Discovery
1. Create `SchemaDiscovery` module
2. Implement recursive JSON walker
3. Generate table schemas with FK relationships
4. Add tests with nested JSON examples

### Phase 3: Build Data Transformer
1. Create `DataTransformer` module
2. Implement flattening with FK generation
3. Handle type inference and conversion
4. Add tests for edge cases (nulls, mixed types, deep nesting)

### Phase 4: Remove Old Code
1. Delete `evaluator.ts`, `parser.ts`, `selector.ts`, `jsonPath.ts`
2. Simplify `index.ts` to orchestration only
3. Update tests to use SQL engine

---

## Benefits of New Architecture

### 1. **No More Reinventing the Wheel**
- SQL parsing, optimization, execution handled by mature engine
- ORDER BY, GROUP BY, aggregations, JOINs: free
- NULL handling, type coercion: correct by default

### 2. **Clear Separation of Concerns**
- Schema discovery: isolated, testable
- Data transformation: isolated, testable
- SQL execution: delegated to engine
- Each module has single responsibility

### 3. **Extensibility**
- New SQL features: just pass through to engine
- New JSON structures: extend schema discovery
- Multiple file formats: add new transformers
- Query optimization: leverage engine's query planner

### 4. **Maintainability**
- Each module can be understood independently
- Changes to schema logic don't affect SQL execution
- Easy to add new table relationship patterns
- Comprehensive testing at each layer

### 5. **Performance**
- SQL engines are highly optimized
- Can leverage indexes for large datasets
- Query planning handles complex queries efficiently

---

## Example: Nested Object Handling

### Input JSON
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

### Schema Discovery Output
```typescript
[
  {
    name: "users",
    path: ["users"],
    columns: [
      { name: "_id", type: "INTEGER" },  // synthetic PK
      { name: "id", type: "INTEGER" },
      { name: "name", type: "TEXT" }
    ]
  },
  {
    name: "users_address",
    path: ["users", "address"],
    columns: [
      { name: "_id", type: "INTEGER" },        // synthetic PK
      { name: "_parent_id", type: "INTEGER" }, // FK to users
      { name: "city", type: "TEXT" },
      { name: "zip", type: "TEXT" }
    ],
    parentTable: "users",
    parentKey: "_parent_id"
  }
]
```

### Generated SQL
```sql
CREATE TABLE users (_id INTEGER PRIMARY KEY, id INTEGER, name TEXT);
CREATE TABLE users_address (_id INTEGER PRIMARY KEY, _parent_id INTEGER, city TEXT, zip TEXT);

INSERT INTO users VALUES (1, 1, 'Alice');
INSERT INTO users_address VALUES (1, 1, 'NYC', '10001');
```

### User Query Options
```sql
-- Option 1: Explicit JOIN
SELECT u.name, a.city FROM users u JOIN users_address a ON u._id = a._parent_id;

-- Option 2: With virtual path support (future enhancement)
SELECT name, address.city FROM users;
-- ↑ Orchestrator rewrites to JOIN before passing to engine
```

---

## Recommendation: Start with SQLite

**Rationale:**
- **Mature**: 20+ years of development, handles SQL edge cases correctly
- **Lightweight**: better-sqlite3 is ~2MB, synchronous API (simpler code)
- **Familiar**: Most developers know SQLite semantics
- **Easy migration**: Can switch to DuckDB later if analytics features are needed

**Initial Dependencies:**
```bash
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

---

## Next Steps

Would you like me to:
1. **Create a detailed implementation plan** for the new architecture?
2. **Prototype the Schema Discovery module** to validate the approach?
3. **Set up SQLite integration** and refactor `runQuery()` as a proof of concept?
4. **Something else?**
