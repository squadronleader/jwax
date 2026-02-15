# Performance Testing Documentation

## Overview
This directory contains performance tests for the jwax application, focusing on JSON loading and schema discovery performance across different scenarios.

## Running Performance Tests

```bash
# Run performance tests only
npm run test:perf

# Run all tests including performance
npm test

# Run performance tests with verbose output
npm run test:perf -- --verbose
```

## Test Scenarios

### 1. Large JSON Files
Tests the system's ability to handle large datasets:
- **Size**: ~50MB JSON files
- **Object count**: 5000+ objects
- **Metrics**: JSON loading time, schema discovery time
- **Threshold**: < 5 seconds for loading, < 2 seconds for schema

### 2. Deep Nesting
Tests performance with deeply nested object graphs:
- **Depth**: 20-25 levels of nesting
- **Structure**: Objects with nested children and sibling arrays
- **Metrics**: Loading time, schema discovery time
- **Threshold**: < 3 seconds for loading, < 1 second for schema

### 3. Dynamic Schemas
Tests handling of varying object structures:
- **Variations tested**:
  - Objects with varying properties (different keys)
  - Objects with many optional fields (null/undefined values)
  - Mixed types for same keys across objects
- **Object count**: 1000 objects with 8 schema variants
- **Threshold**: < 1 second per 1000 objects

### 4. Combined Scenarios
Tests realistic complex scenarios:
- Moderate size (1000 objects)
- Moderate nesting (~10 levels)
- Dynamic schemas with optional fields
- **Threshold**: < 3 seconds for loading, < 1 second for schema

## Performance Metrics

Each test measures:
- **Duration (ms)**: High-precision timing using `performance.now()`
- **Memory (MB)**: Heap memory usage delta
- **Pass/Fail**: Automatic threshold comparison

## Test Output

Performance tests generate a consolidated report at the end:

```
═══════════════════════════════════════════════════════
              PERFORMANCE TEST REPORT
═══════════════════════════════════════════════════════

✓ PASS Large JSON file loading (50MB, 5000 objects): 1234.56ms, 45.32MB (threshold: 5000ms)
✓ PASS Schema discovery for large file: 567.89ms, 12.45MB (threshold: 2000ms)
✓ PASS Deep nested objects (25 levels): 890.12ms, 8.76MB (threshold: 3000ms)
...

───────────────────────────────────────────────────────
Total: 10/10 tests passed
═══════════════════════════════════════════════════════
```

## Performance Thresholds

Thresholds are defined in `performance.test.ts`:

```typescript
const THRESHOLDS = {
  LARGE_FILE_LOAD: 5000,        // 5 seconds for 50MB
  LARGE_FILE_SCHEMA: 2000,      // 2 seconds for schema discovery
  DEEP_NESTING_LOAD: 3000,      // 3 seconds for deep nesting
  DEEP_NESTING_SCHEMA: 1000,    // 1 second for deep schema
  DYNAMIC_SCHEMA_LOAD: 1000,    // 1 second for 1000 objects
  DYNAMIC_SCHEMA_DISCOVERY: 500, // 0.5 seconds for dynamic schema
  COMBINED_LOAD: 3000,          // 3 seconds for combined scenario
  COMBINED_SCHEMA: 1000,        // 1 second for combined schema
};
```

Adjust these values based on your performance requirements and hardware capabilities.

## Test Fixtures

Fixtures are generated on-the-fly to avoid committing large files:

- **`generateLargeFile(count)`**: Creates large datasets with realistic user data
- **`generateDeepNesting(depth)`**: Creates deeply nested object structures
- **`generateDynamicSchema(count)`**: Creates objects with varying schemas
- **`generateCombinedScenario()`**: Combines all complexity factors

All generators support an optional `seed` parameter for reproducibility.

## Understanding Results

### What makes a test PASS or FAIL?
- **PASS**: Operation completed within the defined threshold
- **FAIL**: Operation exceeded the threshold

### What to do if tests fail?
1. **Check hardware**: Performance varies by CPU/RAM
2. **Adjust thresholds**: Update values in `THRESHOLDS` constant
3. **Optimize code**: Profile and improve bottlenecks
4. **Reduce fixture size**: Test with smaller datasets first

### Performance Tips
- Run tests multiple times to account for JIT warmup
- Close other applications to reduce interference
- Use `--expose-gc` flag for more accurate memory measurements:
  ```bash
  node --expose-gc node_modules/.bin/jest test/performance
  ```

## Architecture

### Files
- **`utils.ts`**: Performance measurement utilities (timers, memory tracking, reporting)
- **`fixtures.ts`**: Test data generators for various scenarios
- **`performance.test.ts`**: Jest test suite with all performance tests

### Key Classes
- **`PerformanceTimer`**: High-precision timing using `performance.now()`
- **`MemoryTracker`**: Heap memory usage tracking
- **`measurePerformance()`**: Wrapper function for measuring any operation

## Future Enhancements

Potential improvements (not currently implemented):
- Performance trend tracking over time
- Comparison with baseline/previous runs
- Memory leak detection
- Data transformation/insertion performance tests
- Query execution performance benchmarks
- Visual charts and graphs
- CI/CD integration with performance gates
