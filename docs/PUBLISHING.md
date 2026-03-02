# Publishing to npm

This guide explains how to publish jwax to the npm registry when you're ready.

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
- [ ] Code is built: `npm run build`
- [ ] Version number is correct in `package.json`
- [ ] README.md is up-to-date
- [ ] LICENSE file exists (currently MIT)
- [ ] Repository URL is correct in `package.json`
- [ ] Author field is filled in `package.json`

## Publishing Steps

### 1. Update Version

Follow [semantic versioning](https://semver.org/):

```bash
# Patch release (1.0.0 -> 1.0.1) - bug fixes
npm version patch

# Minor release (1.0.0 -> 1.1.0) - new features, backward compatible
npm version minor

# Major release (1.0.0 -> 2.0.0) - breaking changes
npm version major
```

This automatically:
- Updates `package.json` version
- Creates a git commit
- Creates a git tag

### 2. Test the Package Locally

Always test before publishing:

```bash
# Create CLI tarball
npm pack --workspace=jwax

# Install globally from tarball
npm install -g ./jwax-<version>.tgz

# Test the CLI
jwax samples/demo.json

# Uninstall after testing
npm uninstall -g jwax
```

### 3. Publish to npm

```bash
# Dry run to see what will be published
npm publish --dry-run --workspace=jwax

# Publish CLI
npm publish --workspace=jwax
```

**Note**: The `prepublishOnly` script automatically runs `npm run build && npm test` before publishing.

### 4. Verify Publication

```bash
# View package on npm
npm view jwax

# Install from npm to test
npm install -g jwax

# Test
jwax --help
```

### 5. Create GitHub Release

After publishing to npm:

```bash
# Push version tags to GitHub
git push origin main --tags

# Create a release on GitHub
# Go to: https://github.com/squadronleader/jwax/releases/new
# Select the tag created by `npm version`
# Add release notes
```

## Package Scope

If you want to publish under an organization (e.g., `@yourorg/jwax`):

1. Update `package.json`:
```json
{
  "name": "@yourorg/jwax",
  ...
}
```

2. Publish with access flag:
```bash
npm publish --access public
```

## Unpublishing

If you need to unpublish (within 72 hours):

```bash
# Unpublish a specific version
npm unpublish jwax@1.0.0

# Unpublish all versions (use with caution!)
npm unpublish jwax --force
```

**Warning**: Unpublishing can break dependent projects. Only use in emergencies.

## Updating After Publication

For updates:

```bash
# Make your changes
# Update tests
npm test

# Bump version
npm version patch  # or minor/major

# Publish
npm publish

# Push to GitHub
git push origin main --tags
```

## Package Files

Published workspace packages use their `files` field in `package.json` to control what is included (runtime `dist/`, CLI bin script, package README, plus bundled runtime dependencies).

To check what will be included:
```bash
npm pack --dry-run --workspace=jwax
```

## Useful Commands

```bash
# View your published packages
npm profile get

# View package info
npm view jwax

# Check package size
npm pack --dry-run

# List files that will be included
npm publish --dry-run
```
