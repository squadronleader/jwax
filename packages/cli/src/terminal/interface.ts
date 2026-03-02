import { QueryOrchestrator, FormatterType } from '@jwax/core';

export interface ITerminalInterface {
  start(): void;
  close(): void;
}

export interface TerminalOptions {
  enableAutocomplete?: boolean;
  enableInlineHints?: boolean;
  outputFormat?: FormatterType;
  loadTimeMs?: number;
}
