import { QueryOrchestrator, loadJson, isUrl, FormatterType } from '@jwax/core';
import { PerformanceTimer } from '@jwax/core';
import { ReadlineTerminal } from './terminal';
import { SqlJsAdapter } from './sqljs-adapter';

type EngineMode = 'auto' | 'native' | 'wasm';

export interface CliOptions {
  strictSchema?: boolean;
  timeoutMs?: number;
  outputFormat?: FormatterType;
  tableName?: string;
  showTiming?: boolean;
  engine?: EngineMode;
}

async function createOrchestrator(options: CliOptions): Promise<{ orchestrator: QueryOrchestrator; engineName: 'native' | 'wasm' }> {
  const engineMode = options.engine ?? 'auto';
  if (engineMode === 'wasm') {
    const adapter = await SqlJsAdapter.create();
    return { orchestrator: new QueryOrchestrator(adapter, { strictSchema: options.strictSchema }), engineName: 'wasm' };
  }

  if (engineMode === 'native') {
    return { orchestrator: new QueryOrchestrator('sqlite', { strictSchema: options.strictSchema }), engineName: 'native' };
  }

  try {
    return { orchestrator: new QueryOrchestrator('sqlite', { strictSchema: options.strictSchema }), engineName: 'native' };
  } catch {
    const adapter = await SqlJsAdapter.create();
    return { orchestrator: new QueryOrchestrator(adapter, { strictSchema: options.strictSchema }), engineName: 'wasm' };
  }
}

export async function startCli(source: string | null, options: CliOptions = {}): Promise<void> {
  let root: any;
  
  // Show progress indicator for URLs
  let progressTimer: NodeJS.Timeout | null = null;
  let progressInterval: NodeJS.Timeout | null = null;

  const sourceIsUrl = source && isUrl(source);

  if (sourceIsUrl) {
    progressTimer = setTimeout(() => {
      process.stdout.write('Fetching');
      let dots = 0;
      progressInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        process.stdout.write('\r' + 'Fetching' + '.'.repeat(dots) + '   ');
      }, 500);
    }, 500);
  }

  try {
    root = await loadJson(source, { timeoutMs: options.timeoutMs, tableName: options.tableName });
    
    // Clear progress indicator
    if (progressTimer) clearTimeout(progressTimer);
    if (progressInterval) {
      clearInterval(progressInterval);
      process.stdout.write('\r' + ' '.repeat(20) + '\r'); // Clear the line
    }
  } catch (err: any) {
    // Clear progress indicator
    if (progressTimer) clearTimeout(progressTimer);
    if (progressInterval) {
      clearInterval(progressInterval);
      process.stdout.write('\r' + ' '.repeat(20) + '\r'); // Clear the line
    }
    
    if (sourceIsUrl) {
      console.error('Sorry, could not load JSON from the URL. Please check the URL and try again.');
    } else if (source === null || source === '-') {
      console.error('Failed to load or parse JSON from stdin:', err.message ?? err);
    } else {
      console.error('Failed to load or parse JSON file:', err.message ?? err);
    }
    process.exit(1);
  }

  // Initialize orchestrator and load JSON with timing
  const timer = new PerformanceTimer();
  const { orchestrator, engineName } = await createOrchestrator(options);
  try {
    timer.start();
    orchestrator.loadJson(root);
    const loadTimeMs = timer.stop();

    const sourceName = source === null || source === '-' ? 'stdin' : source;
    console.log(`Loaded ${sourceName}.`);

    // Create terminal interface with autocomplete and inline hints
    const terminal = new ReadlineTerminal(orchestrator, {
      enableAutocomplete: true,
      enableInlineHints: true,
      outputFormat: options.outputFormat,
      engineName,
      loadTimeMs: options.showTiming !== false ? loadTimeMs : undefined,
    });

    terminal.start();
  } catch (err: any) {
    console.error('Failed to process JSON:', err.message ?? err);
    process.exit(1);
  }
}

/**
 * Non-interactive mode: load JSON, execute query, output results as JSON, and exit
 */
export async function startNonInteractiveCli(
  source: string | null,
  query: string,
  options: CliOptions = {}
): Promise<void> {
  let root: any;

  try {
    root = await loadJson(source, { timeoutMs: options.timeoutMs, tableName: options.tableName });
  } catch (err: any) {
    const sourceIsUrl = source && isUrl(source);
    if (sourceIsUrl) {
      console.error('Error: Could not load JSON from the URL. Please check the URL and try again.');
    } else if (source === null || source === '-') {
      console.error('Error: Failed to load or parse JSON from stdin:', err.message ?? err);
    } else {
      console.error('Error: Failed to load or parse JSON file:', err.message ?? err);
    }
    process.exit(1);
  }

  // Initialize orchestrator and load JSON
  const { orchestrator } = await createOrchestrator(options);
  try {
    orchestrator.loadJson(root);
  } catch (err: any) {
    console.error('Error: Failed to process JSON:', err.message ?? err);
    process.exit(1);
  }

  try {
    // Execute query with de-normalization
    const results = orchestrator.executeQueryWithDenormalization(query);
    
    // Output as JSON (already an array of objects)
    console.log(JSON.stringify(results, null, 2));
  } catch (err: any) {
    console.error('Error: Query execution failed:', err.message ?? err);
    process.exit(1);
  } finally {
    orchestrator.close();
  }
}
