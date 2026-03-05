import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { startNonInteractiveCli } from '../src/cli';

describe('startNonInteractiveCli output format', () => {
  let tempDir: string;
  let jsonPath: string;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jwax-cli-test-'));
    jsonPath = path.join(tempDir, 'data.json');
    fs.writeFileSync(jsonPath, JSON.stringify([{ id: 1, title: 'hello' }]), 'utf-8');
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('respects table output format in non-interactive mode', async () => {
    await startNonInteractiveCli(jsonPath, 'select * from root', { outputFormat: 'table', engine: 'wasm' });

    const output = logSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).not.toContain('[\n');
    expect(output).toContain('title');
    expect(output).toContain('hello');
  });
});
