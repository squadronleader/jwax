/**
 * Performance Test Suite
 * Tests JSON loading and schema discovery performance
 */

import { QueryOrchestrator } from '../../src/orchestrator';
import { discoverSchema } from '../../src/schema';
import {
  measurePerformance,
  assertPerformance,
  formatPerformanceReport,
  PerformanceResult,
} from './utils';
import {
  generateLargeFile,
  generateDeepNesting,
  generateDynamicSchema,
  generateCombinedScenario,
  estimateJsonSizeMB,
} from './fixtures';

// Performance thresholds (in milliseconds)
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

describe('Performance Tests', () => {
  let orchestrator: QueryOrchestrator;
  const results: PerformanceResult[] = [];

  beforeEach(() => {
    orchestrator = new QueryOrchestrator();
  });

  afterEach(() => {
    orchestrator.close();
  });

  afterAll(() => {
    // Print consolidated performance report
    console.log('\n' + formatPerformanceReport(results));
  });

  describe('Large JSON Files', () => {
    test('should load large JSON file (50MB, 5000 objects) within threshold', async () => {
      const fixture = generateLargeFile(5000);
      const sizeMB = estimateJsonSizeMB(fixture);

      console.log(`\n  Generated fixture: ${sizeMB.toFixed(2)}MB`);

      const { metrics } = await measurePerformance(
        () => orchestrator.loadJson(fixture),
        'Large file load'
      );

      const result = assertPerformance(
        metrics,
        THRESHOLDS.LARGE_FILE_LOAD,
        'Large JSON file loading (50MB, 5000 objects)'
      );

      results.push(result);

      expect(result.passed).toBe(true);
      expect(orchestrator.listTables().length).toBeGreaterThan(0);
    }, 30000);

    test('should discover schema for large file within threshold', async () => {
      const fixture = generateLargeFile(5000);

      const { metrics } = await measurePerformance(
        () => discoverSchema(fixture),
        'Large file schema discovery'
      );

      const result = assertPerformance(
        metrics,
        THRESHOLDS.LARGE_FILE_SCHEMA,
        'Schema discovery for large file'
      );

      results.push(result);

      expect(result.passed).toBe(true);
    }, 30000);
  });

  describe('Deep Nesting', () => {
    test('should load deeply nested JSON (20+ levels) within threshold', async () => {
      const fixture = generateDeepNesting(25);

      console.log(`\n  Generated fixture: 25 levels deep`);

      const { metrics } = await measurePerformance(
        () => orchestrator.loadJson(fixture),
        'Deep nesting load'
      );

      const result = assertPerformance(
        metrics,
        THRESHOLDS.DEEP_NESTING_LOAD,
        'Deep nested objects (25 levels)'
      );

      results.push(result);

      expect(result.passed).toBe(true);
      expect(orchestrator.listTables().length).toBeGreaterThan(0);
    }, 30000);

    test('should discover schema for deeply nested JSON within threshold', async () => {
      const fixture = generateDeepNesting(25);

      const { metrics } = await measurePerformance(
        () => discoverSchema(fixture),
        'Deep nesting schema discovery'
      );

      const result = assertPerformance(
        metrics,
        THRESHOLDS.DEEP_NESTING_SCHEMA,
        'Schema discovery for deep nesting'
      );

      results.push(result);

      expect(result.passed).toBe(true);
    }, 30000);
  });

  describe('Dynamic Schemas', () => {
    test('should load JSON with varying properties within threshold', async () => {
      const fixture = generateDynamicSchema(1000);

      console.log(`\n  Generated fixture: 1000 objects with varying schemas`);

      const { metrics } = await measurePerformance(
        () => orchestrator.loadJson(fixture),
        'Dynamic schema (varying properties) load'
      );

      const result = assertPerformance(
        metrics,
        THRESHOLDS.DYNAMIC_SCHEMA_LOAD,
        'Dynamic schema - varying properties (1000 objects)'
      );

      results.push(result);

      expect(result.passed).toBe(true);
    }, 30000);

    test('should discover schema for varying properties within threshold', async () => {
      const fixture = generateDynamicSchema(1000);

      const { metrics } = await measurePerformance(
        () => discoverSchema(fixture),
        'Dynamic schema discovery'
      );

      const result = assertPerformance(
        metrics,
        THRESHOLDS.DYNAMIC_SCHEMA_DISCOVERY,
        'Schema discovery - varying properties'
      );

      results.push(result);

      expect(result.passed).toBe(true);
    }, 30000);

    test('should handle objects with many optional fields', async () => {
      const fixture = generateDynamicSchema(1000, { seed: 100 });

      const { metrics } = await measurePerformance(
        () => orchestrator.loadJson(fixture),
        'Dynamic schema (optional fields) load'
      );

      const result = assertPerformance(
        metrics,
        THRESHOLDS.DYNAMIC_SCHEMA_LOAD,
        'Dynamic schema - optional fields (1000 objects)'
      );

      results.push(result);

      expect(result.passed).toBe(true);
    }, 30000);

    test('should handle mixed types for same keys', async () => {
      const fixture = generateDynamicSchema(1000, { seed: 200 });

      const { metrics } = await measurePerformance(
        () => orchestrator.loadJson(fixture),
        'Dynamic schema (mixed types) load'
      );

      const result = assertPerformance(
        metrics,
        THRESHOLDS.DYNAMIC_SCHEMA_LOAD,
        'Dynamic schema - mixed types (1000 objects)'
      );

      results.push(result);

      expect(result.passed).toBe(true);
    }, 30000);
  });

  describe('Combined Scenarios', () => {
    test('should handle combined scenario (large + deep + dynamic)', async () => {
      const fixture = generateCombinedScenario();
      const sizeMB = estimateJsonSizeMB(fixture);

      console.log(`\n  Generated combined fixture: ${sizeMB.toFixed(2)}MB`);

      const { metrics } = await measurePerformance(
        () => orchestrator.loadJson(fixture),
        'Combined scenario load'
      );

      const result = assertPerformance(
        metrics,
        THRESHOLDS.COMBINED_LOAD,
        'Combined scenario (large + deep + dynamic)'
      );

      results.push(result);

      expect(result.passed).toBe(true);
    }, 30000);

    test('should discover schema for combined scenario within threshold', async () => {
      const fixture = generateCombinedScenario();

      const { metrics } = await measurePerformance(
        () => discoverSchema(fixture),
        'Combined scenario schema discovery'
      );

      const result = assertPerformance(
        metrics,
        THRESHOLDS.COMBINED_SCHEMA,
        'Schema discovery - combined scenario'
      );

      results.push(result);

      expect(result.passed).toBe(true);
    }, 30000);
  });
});
