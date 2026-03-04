# jwax

Query JSON files with SQL from your terminal.

## Changelog

See [change.md](./change.md) for release notes.

## Install

```bash
npm install -g jwax
```

## Usage

```bash
jwax samples/demo.json
jwax --query "SELECT * FROM users LIMIT 5" data.json
cat data.json | jwax --query "SELECT * FROM data"
```
