export { registerAdapter } from './detect.js';

/**
 * Wraps a Joi schema with a phantom type for TypeScript inference.
 *
 * Joi schemas do not carry their output type at the TypeScript level,
 * so this wrapper adds a phantom `_output` property that the type
 * inference engine can pick up.
 *
 * @example
 * ```ts
 * import Joi from 'joi';
 * import { joiField } from 'env-validated/adapters/joi';
 *
 * const env = createEnv({
 *   schema: {
 *     PORT: joiField<number>(Joi.number().min(1000).required()),
 *   }
 * });
 * // env.PORT is inferred as number
 * ```
 */
export function joiField<T>(schema: unknown): unknown & { _output: T } {
  return schema as unknown & { _output: T };
}

/**
 * Wraps a Joi object schema to preserve type inference.
 *
 * `Joi.object()` erases inner schema types (`TSchema = any`).
 * This wrapper attaches a `__joiShape` phantom that lets the type
 * inference engine map each field's Joi schema to its output type
 * automatically — **no manual type annotations needed**.
 *
 * @example
 * ```ts
 * import Joi from 'joi';
 * import { joiObject } from 'env-validated/adapters/joi';
 *
 * const env = createEnv({
 *   schema: joiObject({
 *     HOST: Joi.string().required(),
 *     PORT: Joi.number().min(1000).required(),
 *     DEBUG: Joi.boolean().default(false),
 *   }),
 * });
 * // env.HOST → string, env.PORT → number, env.DEBUG → boolean
 * ```
 */
export function joiObject<const T extends Record<string, unknown>>(
  schema: T,
): { __joiShape: T; $_root: unknown; type: 'object' } {
  // Build the Joi.object() at runtime by dynamically requiring Joi
  let Joi: { object: (schema: unknown) => unknown };
  try {
    Joi = require('joi');
  } catch {
    throw new Error('joiObject() requires joi to be installed');
  }
  const joiSchema = Joi.object(schema);
  return Object.assign(joiSchema as object, { __joiShape: schema }) as {
    __joiShape: T;
    $_root: unknown;
    type: 'object';
  };
}
