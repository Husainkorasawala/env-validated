import {
  isObjectSchema,
  resolveField,
  resolveObjectSchema,
} from './adapters/detect.js';
import { isSensitiveKey } from './error.js';
import {
  type CreateEnvOptions,
  EnvSafeError,
  type InferSchemaOutput,
} from './types.js';

// ─── Re-exports ─────────────────────────────────────────────────────

export { registerAdapter } from './adapters/detect.js';
export type {
  BooleanField,
  BuiltInFieldDef,
  EnumField,
  JsonField,
  NumberField,
  PortField,
  StringField,
  UrlField,
} from './built-in/types.js';
export type {
  CreateEnvOptions,
  CustomValidateField,
  EnvSafeValidator,
  InferEnvOutput,
  InferFieldOutput,
  InferSchemaOutput,
  SchemaInput,
  ValidationResult,
} from './types.js';
export { EnvSafeError } from './types.js';

// ─── Source Resolution ──────────────────────────────────────────────

function resolveSource(
  options?: CreateEnvOptions,
): Record<string, string | undefined> {
  if (options?.source) {
    return options.source;
  }

  // Optional dotenv loading
  if (options?.dotenv) {
    try {
      // Use createRequire for ESM compatibility
      const { createRequire } = require('node:module');
      const req = createRequire(import.meta.url);
      const dotenv = req('dotenv');
      const path =
        typeof options.dotenv === 'string' ? options.dotenv : undefined;
      dotenv.config(path ? { path } : undefined);
    } catch {
      // dotenv not installed — silently skip
    }
  }

  // Default: process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env as Record<string, string | undefined>;
  }

  return {};
}

// ─── Error Handling ─────────────────────────────────────────────────

function handleError(
  error: EnvSafeError,
  onError?: 'throw' | 'warn' | ((err: EnvSafeError) => void),
): void {
  if (onError === 'warn') {
    console.warn(error.message);
    return;
  }
  if (typeof onError === 'function') {
    onError(error);
    return;
  }
  // Default: throw
  throw error;
}

// ─── createEnv ──────────────────────────────────────────────────────

export function createEnv<const S>(
  config: { schema: S },
  options?: CreateEnvOptions,
): InferSchemaOutput<S> {
  const source = resolveSource(options);
  const prefix = options?.prefix ?? '';
  const errors: Array<{ key: string; message: string }> = [];

  // ── Object-level schema mode ──────────────────────────────────────
  // When schema is an object-level validator (e.g. z.object(), yup.object()),
  // validate the entire source against it at once.
  if (isObjectSchema(config.schema)) {
    const objectSchemaInfo = resolveObjectSchema(config.schema);
    if (objectSchemaInfo) {
      // Build the source object (apply prefix stripping if needed)
      let effectiveSource: Record<string, string | undefined> = source;
      if (prefix) {
        effectiveSource = {};
        for (const fullKey of Object.keys(source)) {
          if (fullKey.startsWith(prefix)) {
            effectiveSource[fullKey.slice(prefix.length)] = source[fullKey];
          }
        }
      }

      const validation = objectSchemaInfo.validate(effectiveSource);
      if (validation.success) {
        return Object.freeze(validation.value) as InferSchemaOutput<S>;
      }

      const envError = new EnvSafeError([
        {
          key: `[${objectSchemaInfo.adapter} schema]`,
          message: validation.error,
        },
      ]);
      handleError(envError, options?.onError);
      return Object.freeze({}) as InferSchemaOutput<S>;
    }
  }

  // ── Field-by-field mode ───────────────────────────────────────────
  const schema = config.schema as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(schema)) {
    const envKey = prefix ? `${prefix}${key}` : key;
    const raw = source[envKey];
    const field = schema[key];

    const validation = resolveField(field, raw, envKey);

    if (validation.success) {
      result[key] = validation.value;
    } else {
      // Include redacted value context in error for non-sensitive keys
      let errorMsg = validation.error;
      if (
        isSensitiveKey(envKey) &&
        raw !== undefined &&
        !errorMsg.includes('*****')
      ) {
        // Ensure sensitive values are never leaked in error messages
        errorMsg = errorMsg.replace(
          new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          '*****',
        );
      }
      errors.push({ key: envKey, message: errorMsg });
    }
  }

  if (errors.length > 0) {
    const envError = new EnvSafeError(errors);
    handleError(envError, options?.onError);
  }

  return Object.freeze(result) as InferSchemaOutput<S>;
}
