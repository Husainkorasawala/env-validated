import type {
  BuiltInFieldDef,
  EnumField,
  NumberField,
  StringField,
} from './types.js';

// ─── Main dispatcher ────────────────────────────────────────────────

export function parseBuiltIn(
  field: BuiltInFieldDef,
  raw: string | undefined,
  _key: string,
): unknown {
  // Handle missing / empty values
  if (raw === undefined || raw === '') {
    if ('default' in field && field.default !== undefined) {
      return field.default;
    }
    if (field.required === false) {
      return undefined;
    }
    // By default, fields are required
    throw new Error('required, was not set');
  }

  switch (field.type) {
    case 'string':
      return parseString(raw, field);
    case 'number':
      return parseNumber(raw, field);
    case 'boolean':
      return parseBoolean(raw);
    case 'url':
      return parseUrl(raw);
    case 'port':
      return parsePort(raw);
    case 'enum':
      return parseEnum(raw, field);
    case 'json':
      return parseJson(raw);
  }
}

// ─── Individual parsers ─────────────────────────────────────────────

function parseString(raw: string, field: StringField): string {
  if (field.minLength !== undefined && raw.length < field.minLength) {
    throw new Error(
      `must be at least ${field.minLength} characters (got ${raw.length})`,
    );
  }
  if (field.maxLength !== undefined && raw.length > field.maxLength) {
    throw new Error(
      `must be at most ${field.maxLength} characters (got ${raw.length})`,
    );
  }
  if (field.pattern !== undefined && !field.pattern.test(raw)) {
    throw new Error(`must match pattern ${field.pattern}`);
  }
  return raw;
}

function parseNumber(raw: string, field: NumberField): number {
  const num = Number(raw);
  if (Number.isNaN(num)) {
    throw new Error(`must be a number (got "${raw}")`);
  }
  if (field.min !== undefined && num < field.min) {
    throw new Error(`must be >= ${field.min} (got ${num})`);
  }
  if (field.max !== undefined && num > field.max) {
    throw new Error(`must be <= ${field.max} (got ${num})`);
  }
  return num;
}

function parseBoolean(raw: string): boolean {
  const lower = raw.toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') {
    return true;
  }
  if (lower === 'false' || lower === '0' || lower === 'no') {
    return false;
  }
  throw new Error(`must be a boolean (true/false/1/0/yes/no) (got "${raw}")`);
}

function parseUrl(raw: string): string {
  try {
    new URL(raw);
    return raw;
  } catch {
    throw new Error(`must be a valid URL (got "${raw}")`);
  }
}

function parsePort(raw: string): number {
  const num = Number.parseInt(raw, 10);
  if (Number.isNaN(num) || num < 1 || num > 65535) {
    throw new Error(`must be a valid port (1-65535) (got "${raw}")`);
  }
  return num;
}

function parseEnum(raw: string, field: EnumField): string {
  if (!field.values.includes(raw)) {
    throw new Error(
      `must be one of: ${field.values.join(', ')} (got "${raw}")`,
    );
  }
  return raw;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`must be valid JSON (got "${raw}")`);
  }
}
