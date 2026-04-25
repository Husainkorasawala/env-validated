// ─── Base ───────────────────────────────────────────────────────────

interface BuiltInBase {
  required?: boolean;
  default?: unknown;
}

// ─── Field Definitions ──────────────────────────────────────────────

export interface StringField extends BuiltInBase {
  type: 'string';
  default?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}

export interface NumberField extends BuiltInBase {
  type: 'number';
  default?: number;
  min?: number;
  max?: number;
}

export interface BooleanField extends BuiltInBase {
  type: 'boolean';
  default?: boolean;
}

export interface UrlField extends BuiltInBase {
  type: 'url';
  default?: string;
}

export interface PortField extends BuiltInBase {
  type: 'port';
  default?: number;
}

export interface EnumField<T extends readonly string[] = readonly string[]>
  extends BuiltInBase {
  type: 'enum';
  values: T;
  default?: T[number];
}

export interface JsonField extends BuiltInBase {
  type: 'json';
  default?: unknown;
}

// ─── Union ──────────────────────────────────────────────────────────

export type BuiltInFieldDef =
  | StringField
  | NumberField
  | BooleanField
  | UrlField
  | PortField
  | EnumField<readonly string[]>
  | JsonField;

// ─── Type guard ─────────────────────────────────────────────────────

const BUILT_IN_TYPES = new Set([
  'string',
  'number',
  'boolean',
  'url',
  'port',
  'enum',
  'json',
]);

export function isBuiltInField(field: unknown): field is BuiltInFieldDef {
  return (
    field != null &&
    typeof field === 'object' &&
    'type' in field &&
    typeof (field as Record<string, unknown>).type === 'string' &&
    BUILT_IN_TYPES.has((field as Record<string, unknown>).type as string)
  );
}
