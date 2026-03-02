/**
 * Performance Testing Utilities
 */

export interface PerformanceMetrics {
  durationMs: number;
  memoryUsedMB: number;
  timestamp: number;
}

export interface PerformanceResult {
  name: string;
  metrics: PerformanceMetrics;
  passed: boolean;
  threshold?: number;
}

/**
 * High-precision timer for performance measurements
 */
export class PerformanceTimer {
  private startTime: number = 0;
  private endTime: number = 0;

  start(): void {
    // Force garbage collection if available (for more accurate memory measurements)
    if (global.gc) {
      global.gc();
    }
    this.startTime = performance.now();
  }

  stop(): number {
    this.endTime = performance.now();
    return this.getDuration();
  }

  getDuration(): number {
    return this.endTime - this.startTime;
  }
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  private startMemory: number = 0;

  start(): void {
    if (global.gc) {
      global.gc();
    }
    this.startMemory = process.memoryUsage().heapUsed;
  }

  stop(): number {
    const endMemory = process.memoryUsage().heapUsed;
    return (endMemory - this.startMemory) / 1024 / 1024; // Convert to MB
  }

  getCurrentUsageMB(): number {
    return process.memoryUsage().heapUsed / 1024 / 1024;
  }
}

/**
 * Measure performance of a function
 */
export async function measurePerformance<T>(
  fn: () => T | Promise<T>,
  name: string
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const timer = new PerformanceTimer();
  const memTracker = new MemoryTracker();

  memTracker.start();
  timer.start();

  const result = await Promise.resolve(fn());

  const durationMs = timer.stop();
  const memoryUsedMB = memTracker.stop();

  return {
    result,
    metrics: {
      durationMs,
      memoryUsedMB,
      timestamp: Date.now(),
    },
  };
}

/**
 * Assert performance meets threshold
 */
export function assertPerformance(
  metrics: PerformanceMetrics,
  thresholdMs: number,
  name: string
): PerformanceResult {
  const passed = metrics.durationMs <= thresholdMs;

  return {
    name,
    metrics,
    passed,
    threshold: thresholdMs,
  };
}

/**
 * Format performance results for display
 */
export function formatPerformanceResult(result: PerformanceResult): string {
  const status = result.passed ? '✓ PASS' : '✗ FAIL';
  const duration = result.metrics.durationMs.toFixed(2);
  const memory = result.metrics.memoryUsedMB.toFixed(2);
  const threshold = result.threshold ? ` (threshold: ${result.threshold}ms)` : '';

  return `${status} ${result.name}: ${duration}ms, ${memory}MB${threshold}`;
}

/**
 * Format multiple performance results as a report
 */
export function formatPerformanceReport(results: PerformanceResult[]): string {
  const lines = [
    '═══════════════════════════════════════════════════════',
    '              PERFORMANCE TEST REPORT',
    '═══════════════════════════════════════════════════════',
    '',
  ];

  results.forEach((result) => {
    lines.push(formatPerformanceResult(result));
  });

  lines.push('');
  lines.push('───────────────────────────────────────────────────────');

  const totalPassed = results.filter((r) => r.passed).length;
  const totalTests = results.length;

  lines.push(`Total: ${totalPassed}/${totalTests} tests passed`);
  lines.push('═══════════════════════════════════════════════════════');

  return lines.join('\n');
}
