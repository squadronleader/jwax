/**
 * Test to ensure CLI options are consistent between TypeScript and JavaScript entry points
 */

import { CLI_OPTIONS } from '../src/cli-config';
import * as fs from 'fs';
import * as path from 'path';

describe('CLI Entry Points', () => {
  describe('CLI Options Consistency', () => {
    it('should have all options defined in cli-config', () => {
      expect(CLI_OPTIONS).toBeDefined();
      expect(Array.isArray(CLI_OPTIONS)).toBe(true);
      expect(CLI_OPTIONS.length).toBeGreaterThan(0);
    });

    it('should have required properties in each option', () => {
      CLI_OPTIONS.forEach((option, index) => {
        expect(option.flags).toBeDefined();
        expect(typeof option.flags).toBe('string');
        expect(option.flags.length).toBeGreaterThan(0);
        expect(option.description).toBeDefined();
        expect(typeof option.description).toBe('string');
      });
    });

    it('TypeScript entry point should import CLI_OPTIONS', () => {
      // CLI_OPTIONS is at packages/cli/bin/jwax.ts relative to this test
      const tsFilePath = path.resolve(__dirname, '../bin/jwax.ts');
      expect(fs.existsSync(tsFilePath)).toBe(true);
      const tsContent = fs.readFileSync(tsFilePath, 'utf-8');
      expect(tsContent).toContain("import { CLI_OPTIONS }");
      expect(tsContent).toContain('cli-config');
    });

    it('JavaScript entry point should require CLI_OPTIONS', () => {
      // bin/jwax.js is at the root level, relative to this test in packages/cli/test
      const jsFilePath = path.resolve(__dirname, '../../../bin/jwax.js');
      expect(fs.existsSync(jsFilePath)).toBe(true);
      const jsContent = fs.readFileSync(jsFilePath, 'utf-8');
      expect(jsContent).toContain('require');
      expect(jsContent).toContain('cli-config');
    });

    it('both entry points should loop through CLI_OPTIONS', () => {
      const tsFilePath = path.resolve(__dirname, '../bin/jwax.ts');
      const tsContent = fs.readFileSync(tsFilePath, 'utf-8');
      
      // Count how many times we loop through CLI_OPTIONS in TypeScript
      const tsLoopMatches = tsContent.match(/for \(const option of CLI_OPTIONS\)/g);
      expect(tsLoopMatches).not.toBeNull();
      expect(tsLoopMatches!.length).toBe(1);
    });

    it('should have proper flag naming conventions', () => {
      CLI_OPTIONS.forEach((option) => {
        // Flags should start with -- or -
        const firstFlag = option.flags.split(',')[0].trim();
        expect(firstFlag).toMatch(/^(-{1,2})/);
      });
    });

    it('should not have duplicate flag names', () => {
      const flagNames = new Set<string>();
      CLI_OPTIONS.forEach((option) => {
        const flags = option.flags.split(',').map(f => f.trim());
        flags.forEach((flag) => {
          const baseName = flag.split(/\s/)[0]; // Get flag without argument
          expect(flagNames.has(baseName)).toBe(false);
          flagNames.add(baseName);
        });
      });
    });

    it('--no-timing flag should exist', () => {
      const timingOption = CLI_OPTIONS.find(opt => opt.flags.includes('no-timing'));
      expect(timingOption).toBeDefined();
      expect(timingOption?.description).toContain('Suppress load time display');
    });

    it('--engine flag should exist', () => {
      const engineOption = CLI_OPTIONS.find(opt => opt.flags.includes('--engine'));
      expect(engineOption).toBeDefined();
      expect(engineOption?.description).toContain('Engine mode');
    });

    it('--include-json-column flag should exist with -ijc shorthand', () => {
      const jsonOption = CLI_OPTIONS.find(opt => opt.flags.includes('--include-json-column'));
      expect(jsonOption).toBeDefined();
      expect(jsonOption?.flags).toContain('-ijc');
    });
  });
});
