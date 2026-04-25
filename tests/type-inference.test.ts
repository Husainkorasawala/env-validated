import { Type } from '@sinclair/typebox';
import { type } from 'arktype';
import { Schema } from 'effect';
import Joi from 'joi';
import { Number as RtNumber, String as RtString } from 'runtypes';
import { number as ssNumber, string as ssString } from 'superstruct';
import * as v from 'valibot';
import { describe, expectTypeOf, it } from 'vitest';
import * as yup from 'yup';
import { z } from 'zod';
import { joiField } from '../src/adapters/joi.js';
import { createEnv } from '../src/index.js';

// ─── Built-in Types ──────────────────────────────────────────────────

describe('type inference — built-in', () => {
  it('infers string from string field', () => {
    const env = createEnv(
      { schema: { NAME: { type: 'string' as const } } },
      { source: { NAME: 'test' } },
    );
    expectTypeOf(env.NAME).toEqualTypeOf<string>();
  });

  it('infers number from number field', () => {
    const env = createEnv(
      { schema: { PORT: { type: 'number' as const, default: 3000 } } },
      { source: {} },
    );
    expectTypeOf(env.PORT).toEqualTypeOf<number>();
  });

  it('infers boolean from boolean field', () => {
    const env = createEnv(
      { schema: { FLAG: { type: 'boolean' as const, default: false } } },
      { source: {} },
    );
    expectTypeOf(env.FLAG).toEqualTypeOf<boolean>();
  });

  it('infers string from url field', () => {
    const env = createEnv(
      { schema: { URL: { type: 'url' as const } } },
      { source: { URL: 'https://example.com' } },
    );
    expectTypeOf(env.URL).toEqualTypeOf<string>();
  });

  it('infers number from port field', () => {
    const env = createEnv(
      { schema: { PORT: { type: 'port' as const } } },
      { source: { PORT: '8080' } },
    );
    expectTypeOf(env.PORT).toEqualTypeOf<number>();
  });

  it('infers union type from enum field', () => {
    const env = createEnv(
      {
        schema: {
          NODE_ENV: {
            type: 'enum' as const,
            values: ['development', 'production', 'test'] as const,
          },
        },
      },
      { source: { NODE_ENV: 'production' } },
    );
    expectTypeOf(env.NODE_ENV).toEqualTypeOf<
      'development' | 'production' | 'test'
    >();
  });

  it('infers unknown from json field', () => {
    const env = createEnv(
      { schema: { DATA: { type: 'json' as const } } },
      { source: { DATA: '{}' } },
    );
    expectTypeOf(env.DATA).toEqualTypeOf<unknown>();
  });
});

// ─── Custom Validate ─────────────────────────────────────────────────

describe('type inference — custom validate', () => {
  it('infers output type from custom validate function', () => {
    const env = createEnv(
      {
        schema: {
          IPS: {
            validate: (val: string | undefined) =>
              val
                ? {
                    success: true as const,
                    value: val.split(',').map((s) => s.trim()),
                  }
                : { success: false as const, error: 'required' },
          },
        },
      },
      { source: { IPS: '192.168.1.1,10.0.0.1' } },
    );
    expectTypeOf(env.IPS).toEqualTypeOf<string[]>();
  });

  it('infers number from custom validate returning number', () => {
    const env = createEnv(
      {
        schema: {
          COUNT: {
            validate: (val: string | undefined) =>
              val
                ? { success: true as const, value: Number.parseInt(val, 10) }
                : { success: false as const, error: 'required' },
          },
        },
      },
      { source: { COUNT: '42' } },
    );
    expectTypeOf(env.COUNT).toEqualTypeOf<number>();
  });
});

// ─── Zod ─────────────────────────────────────────────────────────────

describe('type inference — zod', () => {
  it('infers string', () => {
    const env = createEnv(
      { schema: { NAME: z.string() } },
      { source: { NAME: 'test' } },
    );
    expectTypeOf(env.NAME).toEqualTypeOf<string>();
  });

  it('infers number from coerce', () => {
    const env = createEnv(
      { schema: { COUNT: z.coerce.number() } },
      { source: { COUNT: '5' } },
    );
    expectTypeOf(env.COUNT).toEqualTypeOf<number>();
  });
});

// ─── Yup ─────────────────────────────────────────────────────────────

describe('type inference — yup', () => {
  it('infers string', () => {
    const env = createEnv(
      { schema: { NAME: yup.string().required() } },
      { source: { NAME: 'test' } },
    );
    expectTypeOf(env.NAME).toEqualTypeOf<string>();
  });

  it('infers number', () => {
    const env = createEnv(
      { schema: { COUNT: yup.number().required() } },
      { source: { COUNT: '5' } },
    );
    expectTypeOf(env.COUNT).toEqualTypeOf<number>();
  });
});

// ─── Valibot ─────────────────────────────────────────────────────────

describe('type inference — valibot', () => {
  it('infers string', () => {
    const env = createEnv(
      { schema: { NAME: v.string() } },
      { source: { NAME: 'test' } },
    );
    expectTypeOf(env.NAME).toEqualTypeOf<string>();
  });

  it('infers number', () => {
    const env = createEnv(
      { schema: { COUNT: v.number() } },
      { source: { COUNT: '5' }, onError: 'warn' },
    );
    expectTypeOf(env.COUNT).toEqualTypeOf<number>();
  });
});

// ─── TypeBox ─────────────────────────────────────────────────────────

describe('type inference — typebox', () => {
  it('infers string', () => {
    const env = createEnv(
      { schema: { NAME: Type.String() } },
      { source: { NAME: 'test' } },
    );
    expectTypeOf(env.NAME).toEqualTypeOf<string>();
  });

  it('infers number', () => {
    const env = createEnv(
      { schema: { COUNT: Type.Number() } },
      { source: { COUNT: '5' } },
    );
    expectTypeOf(env.COUNT).toEqualTypeOf<number>();
  });
});

// ─── ArkType ─────────────────────────────────────────────────────────

describe('type inference — arktype', () => {
  it('infers string', () => {
    const env = createEnv(
      { schema: { NAME: type('string') } },
      { source: { NAME: 'test' } },
    );
    expectTypeOf(env.NAME).toEqualTypeOf<string>();
  });
});

// ─── Superstruct ─────────────────────────────────────────────────────

describe('type inference — superstruct', () => {
  it('infers string', () => {
    const env = createEnv(
      { schema: { NAME: ssString() } },
      { source: { NAME: 'test' } },
    );
    expectTypeOf(env.NAME).toEqualTypeOf<string>();
  });

  it('infers number', () => {
    const env = createEnv(
      { schema: { COUNT: ssNumber() } },
      { source: { COUNT: '5' }, onError: 'warn' },
    );
    expectTypeOf(env.COUNT).toEqualTypeOf<number>();
  });
});

// ─── Runtypes ────────────────────────────────────────────────────────

describe('type inference — runtypes', () => {
  it('infers string', () => {
    const env = createEnv(
      { schema: { NAME: RtString } },
      { source: { NAME: 'test' } },
    );
    expectTypeOf(env.NAME).toEqualTypeOf<string>();
  });

  it('infers number', () => {
    const env = createEnv(
      { schema: { COUNT: RtNumber } },
      { source: { COUNT: '5' }, onError: 'warn' },
    );
    expectTypeOf(env.COUNT).toEqualTypeOf<number>();
  });
});

// ─── Effect Schema ───────────────────────────────────────────────────

describe('type inference — effect', () => {
  it('infers string', () => {
    const env = createEnv(
      { schema: { NAME: Schema.String } },
      { source: { NAME: 'test' } },
    );
    expectTypeOf(env.NAME).toEqualTypeOf<string>();
  });

  it('infers number', () => {
    const env = createEnv(
      { schema: { COUNT: Schema.Number } },
      { source: { COUNT: '5' }, onError: 'warn' },
    );
    expectTypeOf(env.COUNT).toEqualTypeOf<number>();
  });
});

// ─── Joi ─────────────────────────────────────────────────────────────

describe('type inference — joi', () => {
  it('infers string from Joi.string()', () => {
    const env = createEnv(
      { schema: { NAME: Joi.string().required() } },
      { source: { NAME: 'test' } },
    );
    expectTypeOf(env.NAME).toEqualTypeOf<string>();
  });

  it('infers number from Joi.number()', () => {
    const env = createEnv(
      { schema: { PORT: Joi.number().required() } },
      { source: { PORT: '3000' } },
    );
    expectTypeOf(env.PORT).toEqualTypeOf<number>();
  });

  it('infers boolean from Joi.boolean()', () => {
    const env = createEnv(
      { schema: { FLAG: Joi.boolean().required() } },
      { source: { FLAG: 'true' } },
    );
    expectTypeOf(env.FLAG).toEqualTypeOf<boolean>();
  });

  it('infers string with joiField wrapper', () => {
    const env = createEnv(
      { schema: { NAME: joiField<string>(Joi.string().required()) } },
      { source: { NAME: 'test' } },
    );
    expectTypeOf(env.NAME).toEqualTypeOf<string>();
  });
});

// ─── Mixed Schema ────────────────────────────────────────────────────

describe('type inference — mixed schema', () => {
  it('infers correct types across different validators', () => {
    const env = createEnv(
      {
        schema: {
          ZOD_STR: z.string(),
          BUILTIN_NUM: { type: 'number' as const, default: 42 },
          VALIBOT_STR: v.string(),
          CUSTOM_ARR: {
            validate: (val: string | undefined) =>
              val
                ? {
                    success: true as const,
                    value: val.split(','),
                  }
                : { success: false as const, error: 'required' },
          },
        },
      },
      {
        source: {
          ZOD_STR: 'hello',
          VALIBOT_STR: 'world',
          CUSTOM_ARR: 'a,b,c',
        },
      },
    );
    expectTypeOf(env.ZOD_STR).toEqualTypeOf<string>();
    expectTypeOf(env.BUILTIN_NUM).toEqualTypeOf<number>();
    expectTypeOf(env.VALIBOT_STR).toEqualTypeOf<string>();
    expectTypeOf(env.CUSTOM_ARR).toEqualTypeOf<string[]>();
  });
});

// ─── Result Shape ────────────────────────────────────────────────────

describe('type inference — result shape', () => {
  it('result is readonly', () => {
    const env = createEnv(
      { schema: { X: { type: 'string' as const } } },
      { source: { X: 'test' } },
    );
    expectTypeOf(env).toMatchTypeOf<Readonly<Record<string, unknown>>>();
  });

  it('result only has schema keys', () => {
    const env = createEnv(
      { schema: { A: { type: 'string' as const } } },
      { source: { A: 'test' } },
    );
    expectTypeOf(env).toHaveProperty('A');
  });
});
