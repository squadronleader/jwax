import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { normalizeJsonStructure } from './normalizer';

export interface LoadOptions {
  timeoutMs?: number;
  tableName?: string;
}

export function isUrl(input: string): boolean {
  return input.startsWith('http://') || input.startsWith('https://');
}

export function isStdin(source: string | null | undefined): boolean {
  return source === '-' || source === null || source === undefined;
}

export async function loadJson(source: string | null, options: LoadOptions = {}): Promise<any> {
  let json: any;
  let sourceName: string;

  if (isStdin(source)) {
    json = await readJsonFromStdin();
    sourceName = 'stdin';
  } else if (isUrl(source!)) {
    json = await fetchJsonFromUrl(source!, options);
    sourceName = source!;
  } else {
    json = loadJsonFromFile(source!);
    sourceName = source!;
  }

  // Normalize JSON structure (wrap root arrays if needed)
  return normalizeJsonStructure(json, {
    tableName: options.tableName,
    source: sourceName
  });
}

function loadJsonFromFile(filePath: string): any {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

async function readJsonFromStdin(): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    
    process.stdin.on('end', () => {
      try {
        const json = JSON.parse(data);
        resolve(json);
      } catch (err) {
        reject(new Error('Invalid JSON from stdin'));
      }
    });
    
    process.stdin.on('error', (err) => {
      reject(err);
    });
  });
}

async function fetchJsonFromUrl(url: string, options: LoadOptions): Promise<any> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const maxRedirects = 5;

  return new Promise((resolve, reject) => {
    const fetch = (currentUrl: string, redirectCount: number) => {
      if (redirectCount > maxRedirects) {
        reject(new Error('Too many redirects'));
        return;
      }

      const parsedUrl = new URL(currentUrl);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const req = protocol.get(currentUrl, (res) => {
        // Handle redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, currentUrl).toString();
          fetch(redirectUrl, redirectCount + 1);
          return;
        }

        // Handle non-200 responses
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        // Collect response data
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (err) {
            reject(new Error('Invalid JSON'));
          }
        });
      });

      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.on('error', (err) => {
        reject(err);
      });
    };

    fetch(url, 0);
  });
}
