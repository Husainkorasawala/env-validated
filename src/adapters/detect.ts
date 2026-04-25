import { isBuiltInField } from '../built-in/types.js';
import { parseBuiltIn } from '../built-in/validators.js';
import { redactValue } from '../error.js';
import type { ValidationResult } from '../types.js';

// ─── Adapter Registry ───────────────────────────────────────────────

export interface RuntimeAdapter {
  name: string;
  detect(field: unknown): boolean;
  validate(
    field: unknown,
    raw: string | undefined,
    key: string,
  ): ValidationResult;
}

const adapters: RuntimeAdapter[] = [];

export function registerAdapter(adapter: RuntimeAdapter): void {
  // Prevent duplicate registration
  if (!adapters.some((a) => a.name === adapter.name)) {
    adapters.push(adapter);
  }
}

// ─── Detection Functions ────────────────────────────────────────────

function isZodSchema(field: unknown): boolean {
  return (
    field != null &&
    typeof field === 'object' &&
    ('_zod' in field || '_def' in field)
  );
}

function isJoiSchema(field: unknown): boolean {
  return field != null && typeof field === 'object' && '$_root' in field;
}

function isYupSchema(field: unknown): boolean {
  return (
    field != null &&
    typeof field === 'object' &&
    'spec' in field &&
    'tests' in field &&
    'transforms' in field
  );
}

function isValibotSchema(field: unknown): boolean {
  return (
    field != null &&
    typeof field === 'object' &&
    'kind' in field &&
    (field as Record<string, unknown>).kind === 'schema' &&
    '~run' in field
  );
}

function isTypeboxSchema(field: unknown): boolean {
  return (
    field != null &&
    typeof field === 'object' &&
    Symbol.for('TypeBox.Kind') in (field as object)
  );
}

function isArkTypeSchema(field: unknown): boolean {
  return (
    typeof field === 'function' && 'traverse' in field && 'expression' in field
  );
}

function isSuperstructSchema(field: unknown): boolean {
  return (
    field != null &&
    typeof field === 'object' &&
    'refiner' in field &&
    'coercer' in field &&
    'validator' in field
  );
}

function isRuntypesSchema(field: unknown): boolean {
  return (
    field != null &&
    typeof field === 'object' &&
    'check' in field &&
    'guard' in field &&
    'tag' in field
  );
}

function isEffectSchema(field: unknown): boolean {
  return (
    field != null &&
    (typeof field === 'object' || typeof field === 'function') &&
    'ast' in field &&
    'annotations' in field &&
    'pipe' in field
  );
}

function isCustomValidateField(
  field: unknown,
): field is { validate: (value: string | undefined) => ValidationResult } {
  return (
    field != null &&
    typeof field === 'object' &&
    'validate' in field &&
    typeof (field as Record<string, unknown>).validate === 'function'
  );
}

// ─── Built-in Adapter Parsers ───────────────────────────────────────

function parseZod(
  field: unknown,
  raw: string | undefined,
  key: string,
): ValidationResult {
  const schema = field as {
    safeParse: (v: unknown) => unknown;
    _zod?: unknown;
  };
  try {
    const result = schema.safeParse(raw) as {
      success: boolean;
      data?: unknown;
      error?: { issues?: Array<{ message: string }> };
    };
    if (result.success) {
      return { success: true, value: result.data };
    }
    const msg =
      result.error?.issues?.[0]?.message ??
      `invalid value (got ${redactValue(key, raw)})`;
    return { success: false, error: msg };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function parseJoi(
  field: unknown,
  raw: string | undefined,
  _key: string,
): ValidationResult {
  const schema = field as {
    validate: (v: unknown) => { error?: { message: string }; value: unknown };
  };
  const result = schema.validate(raw);
  if (result.error) {
    return { success: false, error: result.error.message };
  }
  return { success: true, value: result.value };
}

function parseYup(
  field: unknown,
  raw: string | undefined,
  _key: string,
): ValidationResult {
  const schema = field as {
    type: string;
    validateSync: (v: unknown) => unknown;
  };
  try {
    // Pre-coerce for numeric/boolean Yup schemas since raw is always a string
    let input: unknown = raw;
    if (raw !== undefined) {
      if (schema.type === 'number') {
        input = Number(raw);
      } else if (schema.type === 'boolean') {
        const lower = raw.toLowerCase();
        if (lower === 'true' || lower === '1') input = true;
        else if (lower === 'false' || lower === '0') input = false;
      }
    }
    const value = schema.validateSync(input);
    return { success: true, value };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function parseValibot(
  field: unknown,
  raw: string | undefined,
  _key: string,
): ValidationResult {
  const schema = field as {
    '~run': (ctx: { value: unknown; typed: boolean; issues: unknown }) => {
      value: unknown;
      issues?: unknown[];
    };
  };
  try {
    const result = schema['~run']({
      value: raw,
      typed: false,
      issues: undefined as unknown as unknown[],
    });
    if (result.issues && (result.issues as unknown[]).length > 0) {
      const firstIssue = (result.issues as Array<{ message?: string }>)[0];
      return {
        success: false,
        error: firstIssue?.message ?? 'validation failed',
      };
    }
    return { success: true, value: result.value };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function parseTypebox(
  field: unknown,
  raw: string | undefined,
  key: string,
): ValidationResult {
  // Typebox requires @sinclair/typebox/value for validation
  // We dynamically import it
  try {
    let Value: {
      Check: (s: unknown, v: unknown) => boolean;
      Decode: (s: unknown, v: unknown) => unknown;
      Convert: (s: unknown, v: unknown) => unknown;
    };
    try {
      Value = require('@sinclair/typebox/value').Value;
    } catch {
      return {
        success: false,
        error: 'TypeBox adapter requires @sinclair/typebox to be installed',
      };
    }

    // Attempt type coercion (string → number, etc.)
    const converted = Value.Convert(field, raw);
    if (Value.Check(field, converted)) {
      return { success: true, value: Value.Decode(field, converted) };
    }
    return {
      success: false,
      error: `invalid value (got ${redactValue(key, raw)})`,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function parseArkType(
  field: unknown,
  raw: string | undefined,
  key: string,
): ValidationResult {
  const t = field as (value: unknown) => unknown;
  const result = t(raw);
  // ArkType returns the value on success, or an errors object
  if (
    result instanceof Error ||
    (result != null && typeof result === 'object' && 'summary' in result)
  ) {
    const msg =
      result instanceof Error
        ? result.message
        : typeof (result as Record<string, unknown>).summary === 'string'
          ? (result as { summary: string }).summary
          : `invalid value (got ${redactValue(key, raw)})`;
    return { success: false, error: msg };
  }
  return { success: true, value: result };
}

function parseSuperstruct(
  field: unknown,
  raw: string | undefined,
  _key: string,
): ValidationResult {
  const struct = field as {
    coercer: (v: unknown, ctx: unknown) => unknown;
    validator: (v: unknown, ctx: unknown) => Iterable<{ message: string }>;
    refiner: (v: unknown, ctx: unknown) => Iterable<{ message: string }>;
  };
  try {
    const coerced = struct.coercer(raw, null);
    // Run validator
    for (const failure of struct.validator(coerced, null)) {
      return { success: false, error: failure.message };
    }
    // Run refiner
    for (const failure of struct.refiner(coerced, null)) {
      return { success: false, error: failure.message };
    }
    return { success: true, value: coerced };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function parseRuntypes(
  field: unknown,
  raw: string | undefined,
  _key: string,
): ValidationResult {
  const rt = field as {
    check: (v: unknown) => unknown;
  };
  try {
    const value = rt.check(raw);
    return { success: true, value };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function parseEffect(
  field: unknown,
  raw: string | undefined,
  _key: string,
): ValidationResult {
  try {
    let SchemaModule: {
      decodeUnknownSync: (schema: unknown) => (value: unknown) => unknown;
    };
    try {
      // effect v3+: Schema is exported from the main 'effect' package
      const effect = require('effect');
      SchemaModule = effect.Schema;
    } catch {
      try {
        // Fallback: older @effect/schema package
        SchemaModule = require('@effect/schema/Schema');
      } catch {
        return {
          success: false,
          error:
            'Effect adapter requires effect or @effect/schema to be installed',
        };
      }
    }
    const value = SchemaModule.decodeUnknownSync(field)(raw);
    return { success: true, value };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ─── Object-Level Schema Detection ─────────────────────────────────

interface ObjectSchemaInfo {
  adapter: string;
  validate: (
    source: Record<string, string | undefined>,
  ) => ValidationResult<Record<string, unknown>>;
}

function isObjectSchema(schema: unknown): boolean {
  // Zod object: has _def.shape or shape()
  if (isZodSchema(schema)) {
    const s = schema as Record<string, unknown>;
    if (typeof s.shape === 'object' && s.shape !== null) return true;
    const def = s._def as Record<string, unknown> | undefined;
    if (def && typeof def.shape === 'object') return true;
  }
  // Joi object: has $_root and type === 'object'
  if (isJoiSchema(schema)) {
    return (schema as { type?: string }).type === 'object';
  }
  // Yup object: has fields
  if (isYupSchema(schema)) {
    return 'fields' in (schema as object);
  }
  // Valibot object: kind === 'schema' and type === 'object'
  if (isValibotSchema(schema)) {
    return (schema as { type?: string }).type === 'object';
  }
  // TypeBox object: kind === 'Object' and has properties
  if (isTypeboxSchema(schema)) {
    return (
      (schema as Record<string | symbol, unknown>)[
        Symbol.for('TypeBox.Kind')
      ] === 'Object' && 'properties' in (schema as object)
    );
  }
  // ArkType object: is function with traverse, expression contains '{'
  if (isArkTypeSchema(schema)) {
    const expr = (schema as { expression?: string }).expression ?? '';
    return expr.includes('{') && expr.includes('}');
  }
  // Superstruct object: has schema property which is an object with struct values
  if (isSuperstructSchema(schema)) {
    return (
      'schema' in (schema as object) &&
      typeof (schema as Record<string, unknown>).schema === 'object' &&
      (schema as Record<string, unknown>).schema !== null
    );
  }
  // Runtypes object: has tag === 'object' and fields
  if (isRuntypesSchema(schema)) {
    return (
      (schema as { tag?: string }).tag === 'object' &&
      'fields' in (schema as object)
    );
  }
  // Effect Schema Struct: has ast + fields
  if (isEffectSchema(schema)) {
    return 'fields' in (schema as object);
  }
  return false;
}

function resolveObjectSchema(schema: unknown): ObjectSchemaInfo | null {
  if (!isObjectSchema(schema)) return null;

  if (isZodSchema(schema)) {
    return {
      adapter: 'zod',
      validate: (source) => {
        const s = schema as {
          safeParse: (v: unknown) => Record<string, unknown>;
        };
        const result = s.safeParse(source);
        if (result.success) {
          return {
            success: true,
            value: result.data as Record<string, unknown>,
          };
        }
        const issues =
          (
            result.error as {
              issues?: Array<{ path?: unknown[]; message: string }>;
            }
          )?.issues ?? [];
        const msg = issues
          .map((i) => {
            const path = Array.isArray(i.path) ? i.path.join('.') : '?';
            return `${path}: ${i.message}`;
          })
          .join('; ');
        return { success: false, error: msg };
      },
    };
  }

  if (isJoiSchema(schema)) {
    return {
      adapter: 'joi',
      validate: (source) => {
        const s = schema as {
          validate: (v: unknown) => {
            error?: { message: string };
            value: unknown;
          };
        };
        const result = s.validate(source);
        if (result.error) {
          return { success: false, error: result.error.message };
        }
        return {
          success: true,
          value: result.value as Record<string, unknown>,
        };
      },
    };
  }

  if (isYupSchema(schema)) {
    return {
      adapter: 'yup',
      validate: (source) => {
        const s = schema as { validateSync: (v: unknown) => unknown };
        try {
          const value = s.validateSync(source);
          return { success: true, value: value as Record<string, unknown> };
        } catch (e) {
          return {
            success: false,
            error: e instanceof Error ? e.message : String(e),
          };
        }
      },
    };
  }

  if (isValibotSchema(schema)) {
    return {
      adapter: 'valibot',
      validate: (source) => {
        const s = schema as {
          '~run': (ctx: {
            value: unknown;
            typed: boolean;
            issues: unknown;
          }) => {
            value: unknown;
            issues?: unknown[];
          };
        };
        try {
          const result = s['~run']({
            value: source,
            typed: false,
            issues: undefined as unknown as unknown[],
          });
          if (result.issues && (result.issues as unknown[]).length > 0) {
            const firstIssue = (
              result.issues as Array<{ message?: string }>
            )[0];
            return {
              success: false,
              error: firstIssue?.message ?? 'validation failed',
            };
          }
          return {
            success: true,
            value: result.value as Record<string, unknown>,
          };
        } catch (e) {
          return {
            success: false,
            error: e instanceof Error ? e.message : String(e),
          };
        }
      },
    };
  }

  if (isTypeboxSchema(schema)) {
    return {
      adapter: 'typebox',
      validate: (source) => {
        try {
          let Value: {
            Check: (s: unknown, v: unknown) => boolean;
            Decode: (s: unknown, v: unknown) => unknown;
            Convert: (s: unknown, v: unknown) => unknown;
          };
          try {
            Value = require('@sinclair/typebox/value').Value;
          } catch {
            return {
              success: false,
              error:
                'TypeBox adapter requires @sinclair/typebox to be installed',
            };
          }
          const converted = Value.Convert(schema, source);
          if (Value.Check(schema, converted)) {
            return {
              success: true,
              value: Value.Decode(schema, converted) as Record<string, unknown>,
            };
          }
          return {
            success: false,
            error: 'TypeBox object schema validation failed',
          };
        } catch (e) {
          return {
            success: false,
            error: e instanceof Error ? e.message : String(e),
          };
        }
      },
    };
  }

  if (isArkTypeSchema(schema)) {
    return {
      adapter: 'arktype',
      validate: (source) => {
        const t = schema as (value: unknown) => unknown;
        const result = t(source);
        if (
          result instanceof Error ||
          (result != null && typeof result === 'object' && 'summary' in result)
        ) {
          const msg =
            result instanceof Error
              ? result.message
              : typeof (result as Record<string, unknown>).summary === 'string'
                ? (result as { summary: string }).summary
                : 'ArkType object schema validation failed';
          return { success: false, error: msg };
        }
        return { success: true, value: result as Record<string, unknown> };
      },
    };
  }

  if (isSuperstructSchema(schema)) {
    return {
      adapter: 'superstruct',
      validate: (source) => {
        try {
          // Use superstruct's module-level validate() for proper context handling
          let ssModule: {
            validate: (
              value: unknown,
              struct: unknown,
            ) => [{ message: string } | undefined, unknown];
          };
          try {
            ssModule = require('superstruct');
          } catch {
            return {
              success: false,
              error: 'Superstruct adapter requires superstruct to be installed',
            };
          }
          const [error, value] = ssModule.validate(source, schema);
          if (error) {
            return { success: false, error: error.message };
          }
          return { success: true, value: value as Record<string, unknown> };
        } catch (e) {
          return {
            success: false,
            error: e instanceof Error ? e.message : String(e),
          };
        }
      },
    };
  }

  if (isRuntypesSchema(schema)) {
    return {
      adapter: 'runtypes',
      validate: (source) => {
        const rt = schema as { check: (v: unknown) => unknown };
        try {
          const value = rt.check(source);
          return { success: true, value: value as Record<string, unknown> };
        } catch (e) {
          return {
            success: false,
            error: e instanceof Error ? e.message : String(e),
          };
        }
      },
    };
  }

  if (isEffectSchema(schema)) {
    return {
      adapter: 'effect',
      validate: (source) => {
        try {
          let SchemaModule: {
            decodeUnknownSync: (s: unknown) => (value: unknown) => unknown;
          };
          try {
            const effect = require('effect');
            SchemaModule = effect.Schema;
          } catch {
            try {
              SchemaModule = require('@effect/schema/Schema');
            } catch {
              return {
                success: false,
                error:
                  'Effect adapter requires effect or @effect/schema to be installed',
              };
            }
          }
          const value = SchemaModule.decodeUnknownSync(schema)(source);
          return { success: true, value: value as Record<string, unknown> };
        } catch (e) {
          return {
            success: false,
            error: e instanceof Error ? e.message : String(e),
          };
        }
      },
    };
  }

  return null;
}

export { isObjectSchema, resolveObjectSchema };

// ─── Main Resolution ────────────────────────────────────────────────

export function resolveField(
  field: unknown,
  raw: string | undefined,
  key: string,
): ValidationResult {
  // 1. Check external adapters (registered via registerAdapter)
  for (const adapter of adapters) {
    if (adapter.detect(field)) {
      return adapter.validate(field, raw, key);
    }
  }

  // 2. Check known adapters in detection order
  if (isZodSchema(field)) return parseZod(field, raw, key);
  if (isJoiSchema(field)) return parseJoi(field, raw, key);
  if (isYupSchema(field)) return parseYup(field, raw, key);
  if (isValibotSchema(field)) return parseValibot(field, raw, key);
  if (isTypeboxSchema(field)) return parseTypebox(field, raw, key);
  if (isArkTypeSchema(field)) return parseArkType(field, raw, key);
  if (isSuperstructSchema(field)) return parseSuperstruct(field, raw, key);
  if (isRuntypesSchema(field)) return parseRuntypes(field, raw, key);
  if (isEffectSchema(field)) return parseEffect(field, raw, key);

  // 3. Custom validate function (checked after adapters since many have .validate)
  if (isCustomValidateField(field)) {
    return field.validate(raw);
  }

  // 4. Built-in validator
  if (isBuiltInField(field)) {
    try {
      const value = parseBuiltIn(field, raw, key);
      return { success: true, value };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return {
    success: false,
    error: `No adapter found for field "${key}". The schema object shape was not recognized.`,
  };
}
