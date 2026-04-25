import { Type } from '@sinclair/typebox';
import { type } from 'arktype';
import { Schema } from 'effect';
import Joi from 'joi';
import { String as RtString } from 'runtypes';
import { string as ssString } from 'superstruct';
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import * as yup from 'yup';
import { z } from 'zod';
import { createEnv } from '../src/index.js';

describe('adapter detection', () => {
  it('correctly detects and validates mixed schemas in one call', () => {
    const env = createEnv(
      {
        schema: {
          ZOD_FIELD: z.string(),
          JOI_FIELD: Joi.string().required(),
          YUP_FIELD: yup.string().required(),
          VALIBOT_FIELD: v.string(),
          TYPEBOX_FIELD: Type.String(),
          ARKTYPE_FIELD: type('string'),
          SUPERSTRUCT_FIELD: ssString(),
          RUNTYPES_FIELD: RtString,
          EFFECT_FIELD: Schema.String,
          BUILTIN_FIELD: { type: 'string' as const },
          CUSTOM_FIELD: {
            validate: (val: string | undefined) =>
              val
                ? { success: true as const, value: val.toUpperCase() }
                : { success: false as const, error: 'required' },
          },
        },
      },
      {
        source: {
          ZOD_FIELD: 'zod',
          JOI_FIELD: 'joi',
          YUP_FIELD: 'yup',
          VALIBOT_FIELD: 'valibot',
          TYPEBOX_FIELD: 'typebox',
          ARKTYPE_FIELD: 'arktype',
          SUPERSTRUCT_FIELD: 'superstruct',
          RUNTYPES_FIELD: 'runtypes',
          EFFECT_FIELD: 'effect',
          BUILTIN_FIELD: 'builtin',
          CUSTOM_FIELD: 'custom',
        },
      },
    );

    expect(env.ZOD_FIELD).toBe('zod');
    expect(env.JOI_FIELD).toBe('joi');
    expect(env.YUP_FIELD).toBe('yup');
    expect(env.VALIBOT_FIELD).toBe('valibot');
    expect(env.TYPEBOX_FIELD).toBe('typebox');
    expect(env.ARKTYPE_FIELD).toBe('arktype');
    expect(env.SUPERSTRUCT_FIELD).toBe('superstruct');
    expect(env.RUNTYPES_FIELD).toBe('runtypes');
    expect(env.EFFECT_FIELD).toBe('effect');
    expect(env.BUILTIN_FIELD).toBe('builtin');
    expect(env.CUSTOM_FIELD).toBe('CUSTOM');
  });

  it('does not confuse built-in with external validators', () => {
    // A built-in field with type: 'string' should not be detected as superstruct
    // (superstruct also has a 'type' property)
    const env = createEnv(
      {
        schema: {
          A: { type: 'number' as const, default: 42 },
          B: { type: 'boolean' as const, default: true },
        },
      },
      { source: {} },
    );
    expect(env.A).toBe(42);
    expect(env.B).toBe(true);
  });
});
