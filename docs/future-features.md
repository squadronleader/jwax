# Future Features for jwax

## Design Philosophy
- **Usability First**: Small learning curve for new users
- **Leverage SQL familiarity**: Users already know SQL, so don't require new query languages
- **One-off exploration focus**: Primary use case is quick JSON exploration and querying

---

## Feature Ideas

### 1. **Schema Display on Load** (PARKING FOR UX CONSIDERATION)
**Problem**: Autocomplete field names requires knowing available tables upfront, which creates awkward backtracking if implementing mid-query.

**Proposed Solutions**:
- **Option 1 (Recommended)**: Display available tables & columns immediately after loading, before REPL prompt
  - Show in format: `Table (col1, col2, col3)`
  - Users see what they can query without typing anything
  - Low friction, natural SQL experience
  
- **Option 2**: Smart context-aware autocomplete
  - `SELECT [TAB]` shows all columns grouped by table
  - As user types `FROM users`, suggestions filter to that table's columns
  - More sophisticated, requires smarter parsing
  
- **Option 3**: Enhance `:schema` command
  - Keep existing command but make it more discoverable
  - Combine with Option 1 for best UX

**Status**: Needs more UX thought before implementation

---

### 2. **Output Formatting & Export**
Export results in multiple formats:
- `--output csv` / `--output json` / `--output table`
- Useful for piping into other tools
- Default to JSON for Unix-friendly piping

---

### 3. **Quick Result Commands**
One-liner shortcuts for common queries:
- `--sample` → preview first 10 rows
- `--count` → count records per table
- `--info` → schema overview + record counts

---

### 4. **Query Caching/Shortcuts**
- Save frequently used queries as named aliases
- Config file (`.jwax`) to store preferences
- Auto-load on startup

---

### 5. **Better Error Messages**
- Suggest similar table/column names on typos
- Show available options when query fails
- Example: `Error: table "user" not found. Did you mean "users"? Available: users, orders`

---

### 6. **Batch Query Mode**
- Run multiple SQL files at once
- Output each result separately
- Good for automation/scripting

---

### 7. **Multi-source Queries**
- Load multiple JSON files and join across them
- Query relationships between datasets

---

### 8. **Data Transformation Pipeline**
- Filter/transform JSON before loading
- Derived columns from SQL expressions
- Useful for cleaning messy data

---

## Priorities by Impact
1. Better error messages (quick win, high UX impact)
2. Schema display on load (solves usability friction)
3. Quick result commands (reduces typing, faster exploration)
4. Output formatting (enables scripting/integration)
