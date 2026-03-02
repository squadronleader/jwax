/**
 * Mock factory to create fake TextDocument objects
 * We don't import vscode directly to avoid module resolution issues in tests
 */
function createMockDocument(languageId: string, text: string): any {
  return {
    getText: jest.fn(() => text),
    languageId,
  };
}

// Mock the vscode module before importing the extension
jest.mock('vscode', () => ({}), { virtual: true });

import { checkDocumentIsJson } from '../src/extension';

describe('checkDocumentIsJson', () => {
  it('should return true for document with json languageId', () => {
    const doc = createMockDocument('json', '{"key": "value"}');
    expect(checkDocumentIsJson(doc)).toBe(true);
  });

  it('should return true for document with jsonc languageId', () => {
    const doc = createMockDocument('jsonc', '{"key": "value", /* comment */ "other": 1}');
    expect(checkDocumentIsJson(doc)).toBe(true);
  });

  it('should return true for plaintext document with valid JSON object', () => {
    const doc = createMockDocument('plaintext', '{"key": "value"}');
    expect(checkDocumentIsJson(doc)).toBe(true);
  });

  it('should return true for plaintext document with valid JSON array', () => {
    const doc = createMockDocument('plaintext', '[1, 2, 3]');
    expect(checkDocumentIsJson(doc)).toBe(true);
  });

  it('should return false for non-JSON languageId with non-JSON text', () => {
    const doc = createMockDocument('javascript', 'function hello() { return 42; }');
    expect(checkDocumentIsJson(doc)).toBe(false);
  });

  it('should return true for empty document with json languageId', () => {
    const doc = createMockDocument('json', '');
    expect(checkDocumentIsJson(doc)).toBe(true);
  });

  it('should return false for document starting with invalid JSON character', () => {
    const doc = createMockDocument('plaintext', 'const data = {"key": "value"}');
    expect(checkDocumentIsJson(doc)).toBe(false);
  });

  it('should delegate to isJsonText for unrecognized languageId', () => {
    const doc = createMockDocument('unknown', '{"valid": "json"}');
    expect(checkDocumentIsJson(doc)).toBe(true);
  });

  it('should return false for unrecognized languageId with non-JSON text', () => {
    const doc = createMockDocument('unknown', 'some random text');
    expect(checkDocumentIsJson(doc)).toBe(false);
  });

  it('should return true for text with leading whitespace', () => {
    const doc = createMockDocument('plaintext', '  \n  [{"id": 1}]');
    expect(checkDocumentIsJson(doc)).toBe(true);
  });
});
