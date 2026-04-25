import type { BuiltInFieldDef, EnumField } from './built-in/types.js';

// ─── Validator Contract ─────────────────────────────────────────────

export type ValidationResult<T = unknown> =
  | { success: true; value: T }
  | { success: false; error: string };

export interface EnvSafeValidator {
  validate(value: string | undefined): ValidationResult;
}

// ─── Custom Validate Function ───────────────────────────────────────

export interface CustomValidateField<T = unknown> {
  validate: (value: string | undefined) => ValidationResult<T>;
}

// ─── Options ────────────────────────────────────────────────────────

export interface CreateEnvOptions {
  source?: Record<string, string | undefined>;
  onError?: 'throw' | 'warn' | ((error: EnvSafeError) => void);
  dotenv?: boolean | string;
  prefix?: string;
}

// ─── EnvSafeError ───────────────────────────────────────────────────

export class EnvSafeError extends Error {
  public readonly errors: ReadonlyArray<{ key: string; message: string }>;

  constructor(errors: Array<{ key: string; message: string }>) {
    const header = `[env-validated] Missing or invalid environment variables:\n`;
    const lines = errors
      .map((e) => `  \u2716 ${e.key} \u2014 ${e.message}`)
      .join('\n');
    const footer = '\n\nFix these before starting the app.';
    super(`${header}${lines}${footer}`);
    this.name = 'EnvSafeError';
    this.errors = errors;
  }
}

// ─── Type Inference Engine ──────────────────────────────────────────

/**
 * Maps a built-in field definition to its output TypeScript type.
 */
type BuiltInOutputType<F> =
  F extends EnumField<infer V>
    ? V[number]
    : F extends { type: 'number' | 'port' }
      ? number
      : F extends { type: 'boolean' }
        ? boolean
        : F extends { type: 'string' | 'url' }
          ? string
          : F extends { type: 'json' }
            ? unknown
            : string;

/**
 * Infers the output type of a single schema field.
 *
 * Uses structural conditional types to match phantom properties
 * on each validator library's schema objects. This means no imports
 * of external libraries are needed at the type level.
 */
export type InferFieldOutput<F> =
  // Built-in validators
  F extends BuiltInFieldDef
    ? BuiltInOutputType<F>
    : // Custom validate function
      F extends {
          validate: (
            value: string | undefined,
          ) =>
            | { success: true; value: infer T }
            | { success: false; error: string };
        }
      ? T
      : // Zod v4: _zod.output phantom
        F extends { _zod: { output: infer O } }
        ? O
        : // Zod v3: _output phantom
          F extends { _output: infer O }
          ? O
          : // Yup: __outputType phantom
            F extends { __outputType: infer O }
            ? O
            : // Valibot: _types.output phantom
              F extends { '~standard': { types: { output: infer O } } }
              ? O
              : // ArkType: infer phantom (when available at type level)
                F extends { inferOut: infer O }
                ? O
                : // Typebox: static phantom
                  F extends { static: infer O }
                  ? O
                  : // Superstruct: TYPE phantom
                    F extends { TYPE: infer O }
                    ? O
                    : // Runtypes: guard type predicate
                      F extends {
                          guard(x: unknown): x is infer O;
                        }
                      ? O
                      : // Effect Schema: Type phantom
                        F extends { Type: infer O }
                        ? O
                        : // Joi: structural matching on schema-specific methods
                          // (Joi's StandardSchema types don't propagate TSchema)
                          F extends {
                              _flags: Record<string, unknown>;
                              alphanum(): unknown;
                              email(): unknown;
                            }
                          ? string
                          : F extends {
                                _flags: Record<string, unknown>;
                                greater(limit: number): unknown;
                                integer(): unknown;
                              }
                            ? number
                            : F extends {
                                  _flags: Record<string, unknown>;
                                  truthy(...values: unknown[]): unknown;
                                  falsy(...values: unknown[]): unknown;
                                }
                              ? boolean
                              : F extends {
                                    _flags: Record<string, unknown>;
                                    iso(): unknown;
                                    timestamp(): unknown;
                                  }
                                ? Date
                                : // Unknown schema — falls back to unknown
                                  unknown;

/**
 * Maps an entire field-by-field schema object to its output type.
 */
export type InferEnvOutput<S extends Record<string, unknown>> = {
  readonly [K in keyof S]: InferFieldOutput<S[K]>;
};

/**
 * Maps a Joi schema type to its output TypeScript type using structural matching.
 * Reuses the same logic as the Joi branch in InferFieldOutput.
 */
type InferJoiFieldOutput<F> = F extends {
  alphanum(): unknown;
  email(): unknown;
}
  ? string
  : F extends { greater(limit: number): unknown; integer(): unknown }
    ? number
    : F extends {
          truthy(...values: unknown[]): unknown;
          falsy(...values: unknown[]): unknown;
        }
      ? boolean
      : F extends { iso(): unknown; timestamp(): unknown }
        ? Date
        : unknown;

/**
 * Maps a Joi schema shape (from joiObject) to its output type.
 */
type InferJoiObjectOutput<T> = {
  [K in keyof T]: InferJoiFieldOutput<T[K]>;
};

/**
 * Extracts the output type from an object-level validator schema.
 *
 * Uses structural conditional types matching phantom properties
 * on each validator library's object/struct schema types.
 */
type InferObjectSchemaOutput<S> =
  // Joi object via joiObject() wrapper — uses __joiShape phantom
  S extends { __joiShape: infer Shape extends Record<string, unknown> }
    ? InferJoiObjectOutput<Shape>
    : // Zod v4: _zod.output
      S extends { _zod: { output: infer O } }
      ? O
      : // Zod v3: _output
        S extends { _output: infer O }
        ? O
        : // Yup: __outputType
          S extends { __outputType: infer O }
          ? O
          : // ArkType: inferOut
            S extends { inferOut: infer O }
            ? O
            : // Typebox: static
              S extends { static: infer O }
              ? O
              : // Superstruct: TYPE
                S extends { TYPE: infer O }
                ? O
                : // Runtypes: guard type predicate
                  S extends { guard(x: unknown): x is infer O }
                  ? O
                  : // Effect Schema: Type
                    S extends { Type: infer O }
                    ? O
                    : // Valibot / StandardSchema: extract via ~standard.types (optional)
                      S extends { '~standard': { types?: infer T } }
                      ? NonNullable<T> extends { output: infer O }
                        ? O
                        : unknown
                      : unknown;

/**
 * Detects whether S is an object-level validator schema (e.g. z.object(), yup.object())
 * or a field-by-field record of individual validators.
 *
 * When an object-level schema is passed, the output type is extracted directly
 * from the validator's phantom types. Otherwise, falls back to per-field inference.
 */
/**
 * Helper: true when T is `any`.
 * Uses the fact that `0 extends (1 & T)` is true only for `any`.
 */
type IsAny<T> = 0 extends 1 & T ? true : false;

export type InferSchemaOutput<S> =
  InferObjectSchemaOutput<S> extends infer O
    ? IsAny<O> extends true
      ? // Object schema resolved to `any` (e.g. Joi.object() has TSchema=any).
        // Fall back to Record<string, unknown> for safety.
        Readonly<Record<string, unknown>>
      : [O] extends [Record<string, unknown>]
        ? Readonly<O>
        : S extends Record<string, unknown>
          ? InferEnvOutput<S>
          : Readonly<Record<string, unknown>>
    : never;

// ─── Schema type alias ──────────────────────────────────────────────

export type SchemaInput = Record<string, unknown>;
