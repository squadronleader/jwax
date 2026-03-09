/**
 * Type Inference
 * Infer SQL column types from JSON values
 */

import { ColumnDef } from '../engine/types';

export function inferType(value: any): ColumnDef['type'] {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  const type = typeof value;

  if (type === 'number') {
    return Number.isInteger(value) ? 'INTEGER' : 'REAL';
  }

  if (type === 'boolean') {
    return 'INTEGER'; // SQLite stores booleans as 0/1
  }

  if (type === 'string') {
    return 'TEXT';
  }

  if (type === 'object' || Array.isArray(value)) {
    return 'TEXT'; // Will be JSON.stringify'd
  }

  return 'TEXT'; // Default fallback
}

export interface InferOptions {
  samples?: number;
  strictSchema?: boolean;
}

export function inferColumnTypes(
  objects: any[],
  options: InferOptions | number = {}
): Map<string, ColumnDef> {
  // Support legacy numeric argument for backward compatibility
  const opts: InferOptions = typeof options === 'number'
    ? { samples: options }
    : options;
  const samples = opts.samples ?? 100;
  const strictSchema = opts.strictSchema ?? false;

  const columns = new Map<string, ColumnDef>();
  
  if (objects.length === 0) {
    return columns;
  }

  // Sample first N objects to discover all columns
  const samplesToCheck = objects.slice(0, Math.min(samples, objects.length));
  
  // Collect all property names and their types
  const propertyTypes = new Map<string, Set<ColumnDef['type']>>();
  const propertyNullable = new Map<string, boolean>();
  const allPropertyNames = new Set<string>();

  // First pass: collect all property names across all objects
  for (const obj of samplesToCheck) {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      allPropertyNames.add('value');
      continue;
    }

    for (const [key, value] of Object.entries(obj)) {
      // Skip nested objects and arrays - they become separate tables
      if (value !== null && typeof value === 'object') {
        continue;
      }
      allPropertyNames.add(key);
    }
  }

  // Second pass: check each object for each property
  for (const obj of samplesToCheck) {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      const key = 'value';
      const seenProps = new Set<string>([key]);

      if (!propertyTypes.has(key)) {
        propertyTypes.set(key, new Set());
        propertyNullable.set(key, false);
      }

      const type = inferType(obj);
      propertyTypes.get(key)!.add(type);

      if (obj === null || obj === undefined) {
        propertyNullable.set(key, true);
      }

      for (const propName of allPropertyNames) {
        if (!seenProps.has(propName)) {
          propertyNullable.set(propName, true);
        }
      }

      continue;
    }

    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      continue;
    }

    const seenProps = new Set<string>();

    for (const [key, value] of Object.entries(obj)) {
      // Skip nested objects and arrays - they become separate tables
      if (value !== null && typeof value === 'object') {
        continue;
      }

      seenProps.add(key);

      if (!propertyTypes.has(key)) {
        propertyTypes.set(key, new Set());
        propertyNullable.set(key, false);
      }

      const type = inferType(value);
      propertyTypes.get(key)!.add(type);

      // Check if this property is nullable
      if (value === null || value === undefined) {
        propertyNullable.set(key, true);
      }
    }

    // Mark properties not present in this object as nullable
    for (const propName of allPropertyNames) {
      if (!seenProps.has(propName)) {
        propertyNullable.set(propName, true);
      }
    }
  }

  // Create column definitions
  for (const [propName, types] of propertyTypes) {
    const typeArray = Array.from(types);
    
    // Resolve type conflicts
    let finalType: ColumnDef['type'] = 'TEXT'; // Default fallback

    if (typeArray.length === 1) {
      finalType = typeArray[0];
    } else {
      // Multiple types detected - need to widen
      if (types.has('TEXT')) {
        // If any value is TEXT, make the column TEXT
        finalType = 'TEXT';
      } else if (types.has('REAL')) {
        // If we have both INTEGER and REAL, use REAL
        finalType = 'REAL';
      } else if (types.has('INTEGER')) {
        finalType = 'INTEGER';
      } else if (types.has('NULL')) {
        // If only NULL, still use TEXT
        finalType = 'TEXT';
      }
    }

    columns.set(propName, {
      name: propName,
      type: finalType,
      nullable: strictSchema ? (propertyNullable.get(propName) ?? true) : true
    });
  }

  return columns;
}
