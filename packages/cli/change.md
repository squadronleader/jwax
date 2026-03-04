# Changelog

## v1.1.0.0 (2026-03-04)

Changes since `v1.0.0.0`:

### Features
- Added automatic SQL engine fallback to `wasm` when native SQLite is unavailable, with `--engine` override support.
- Refactored CLI flags to include shorthand options.
- Renamed table-related options and updated default top-level array table behavior to `root`.

### Bugfixes
- Fixed root-level property handling so tables are created correctly.
- Updated package/docs references and docs workflow dependencies.

## v1.0.0.0 (2026-03-01)

### Initial Release
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

