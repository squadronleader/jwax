import { SQLEngineAdapter } from './types';
import { SQLiteAdapter } from './sqlite-adapter';

export * from './types';
export * from './sqlite-adapter';

export function createEngine(type: 'sqlite' = 'sqlite'): SQLEngineAdapter {
  switch (type) {
    case 'sqlite':
      return new SQLiteAdapter();
    default:
      throw new Error(`Unsupported engine type: ${type}`);
  }
}
