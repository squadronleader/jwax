# Publishing to npm

This guide explains how to publish the `jwax` CLI to the npm registry.

## Architecture Notes

Only `packages/cli` (published as `jwax`) is distributed via npm. `packages/core` is a private workspace package — its code is **bundled directly into `dist/cli.js`** at build time using `tsup`, so no separate publish is needed and users only install one package.

## Prerequisites

1. **npm Account**: Create one at [npmjs.com](https://www.npmjs.com/signup)
2. **npm CLI**: Already installed with Node.js
3. **Authentication**: Login to npm from command line

```bash
npm login
```

## Pre-Publishing Checklist

Before publishing, ensure:

- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `cd packages/cli && npm run build`
- [ ] Version number is correct in `packages/cli/package.json`
- [ ] README.md is up-to-date
- [ ] Repository URL is correct in `packages/cli/package.json`
- [ ] Author field is filled in `packages/cli/package.json`

## Publishing Steps

### 1. Update Version

Run this from `packages/cli`. Follow [semantic versioning](https://semver.org/):

```bash
cd packages/cli

# Patch release (1.0.0 -> 1.0.1) - bug fixes
npm version patch

# Minor release (1.0.0 -> 1.1.0) - new features, backward compatible
npm version minor

# Major release (1.0.0 -> 2.0.0) - breaking changes
npm version major
```

This automatically updates `package.json`, creates a git commit, and creates a git tag.

### 2. Test the Package Locally

See the [Local Testing](#local-testing) section below.

### 3. Publish to npm

```bash
cd packages/cli

# Dry run — confirms what will be published without actually publishing
npm publish --dry-run

# Publish
npm publish
```

**Note**: The `prepublishOnly` script automatically runs `npm run build && npm test` before publishing.

### 4. Verify Publication

```bash
# View package info on npm
npm view jwax

# Install from npm globally and test
npm install -g jwax
jwax --version
jwax --help

# Uninstall
npm uninstall -g jwax
```

### 5. Create GitHub Release

```bash
# Push version tag to GitHub
git push origin main --tags

# Then create a release at:
# https://github.com/squadronleader/jwax/releases/new
# Select the tag created by `npm version` and add release notes
```

## Local Testing

### Quick test (no tarball)

Installs directly from the package directory — fast for iterative development:

```bash
cd packages/cli
npm run build
npm install -g .
jwax --version
jwax --query "SELECT * FROM users" samples/demo.json
npm uninstall -g jwax
```

### Full end-to-end test (closest to real publish)

Packs a tarball and installs it — tests exactly what users will get:

```bash
cd packages/cli
npm run build
npm pack

npm install -g ./jwax-<version>.tgz
jwax --version
jwax --query "SELECT * FROM users" samples/demo.json

npm uninstall -g jwax
rm jwax-<version>.tgz
```

To inspect the tarball contents before installing:

```bash
npm pack --dry-run
```

## Updating After Publication

```bash
cd packages/cli

# Bump version
npm version patch  # or minor/major

# Publish (build + tests run automatically)
npm publish

# Push to GitHub
git push origin main --tags
```

## Unpublishing

If you need to unpublish (only possible within 72 hours):

```bash
npm unpublish jwax@1.0.0
```

**Warning**: Unpublishing can break dependent projects. Only use in emergencies.
