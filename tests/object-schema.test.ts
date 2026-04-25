import { Type } from '@sinclair/typebox';
import { type } from 'arktype';
import { Schema } from 'effect';
import Joi from 'joi';
import { Object as RtObject, String as RtString } from 'runtypes';
import { object, string } from 'superstruct';
import * as v from 'valibot';
import { describe, expect, expectTypeOf, it } from 'vitest';
import * as yup from 'yup';
import { z } from 'zod';
import { joiObject } from '../src/adapters/joi.js';
import { createEnv, EnvSafeError } from '../src/index.js';

describe('object-level schema support', () => {
  // ─── Zod ────────────────────────────────────────────────────────────

  describe('zod object', () => {
    it('validates using z.object() directly', () => {
      const schema = z.object({
        HOST: z.string(),
        PORT: z.coerce.number(),
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000' } },
      );

      expect(env.HOST).toBe('localhost');
      expect(env.PORT).toBe(3000);
    });

    it('infers correct types from z.object()', () => {
      const schema = z.object({
        HOST: z.string(),
        PORT: z.coerce.number(),
        DEBUG: z.coerce.boolean(),
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000', DEBUG: 'true' } },
      );

      expectTypeOf(env.HOST).toEqualTypeOf<string>();
      expectTypeOf(env.PORT).toEqualTypeOf<number>();
      expectTypeOf(env.DEBUG).toEqualTypeOf<boolean>();
    });

    it('reports validation errors from z.object()', () => {
      const schema = z.object({
        PORT: z.coerce.number().min(1000),
      });

      expect(() => createEnv({ schema }, { source: { PORT: '80' } })).toThrow(
        EnvSafeError,
      );
    });
  });

  // ─── Joi ────────────────────────────────────────────────────────────

  describe('joi object', () => {
    it('validates using joiObject() wrapper', () => {
      const schema = joiObject({
        HOST: Joi.string().required(),
        PORT: Joi.number().required(),
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000' } },
      );

      expect(env.HOST).toBe('localhost');
      expect(env.PORT).toBe(3000);
    });

    it('infers correct types from joiObject()', () => {
      const schema = joiObject({
        HOST: Joi.string().required(),
        PORT: Joi.number().required(),
        DEBUG: Joi.boolean().default(false),
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000', DEBUG: 'true' } },
      );

      expectTypeOf(env.HOST).toEqualTypeOf<string>();
      expectTypeOf(env.PORT).toEqualTypeOf<number>();
      expectTypeOf(env.DEBUG).toEqualTypeOf<boolean>();
    });

    it('reports validation errors from joiObject()', () => {
      const schema = joiObject({
        PORT: Joi.number().min(1000).required(),
      });

      expect(() => createEnv({ schema }, { source: { PORT: '80' } })).toThrow(
        EnvSafeError,
      );
    });

    it('falls back to Record<string, unknown> for raw Joi.object()', () => {
      const schema = Joi.object({
        HOST: Joi.string().required(),
      });

      const env = createEnv({ schema }, { source: { HOST: 'localhost' } });

      // Raw Joi.object() returns Record<string, unknown> — not `any`
      expectTypeOf(env).toEqualTypeOf<Readonly<Record<string, unknown>>>();
      expect(env.HOST).toBe('localhost');
    });
  });

  // ─── Yup ────────────────────────────────────────────────────────────

  describe('yup object', () => {
    it('validates using yup.object() directly', () => {
      const schema = yup.object({
        HOST: yup.string().required(),
        PORT: yup.number().required(),
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000' } },
      );

      expect(env.HOST).toBe('localhost');
      expect(env.PORT).toBe(3000);
    });

    it('infers correct types from yup.object()', () => {
      const schema = yup.object({
        HOST: yup.string().required(),
        PORT: yup.number().required(),
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000' } },
      );

      expectTypeOf(env.HOST).toEqualTypeOf<string>();
      expectTypeOf(env.PORT).toEqualTypeOf<number>();
    });
  });

  // ─── Valibot ────────────────────────────────────────────────────────

  describe('valibot object', () => {
    it('validates using v.object() directly', () => {
      const schema = v.object({
        HOST: v.string(),
        PORT: v.string(),
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000' } },
      );

      expect(env.HOST).toBe('localhost');
      expect(env.PORT).toBe('3000');
    });

    it('infers correct types from v.object()', () => {
      const schema = v.object({
        HOST: v.string(),
        PORT: v.string(),
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000' } },
      );

      expectTypeOf(env.HOST).toEqualTypeOf<string>();
      expectTypeOf(env.PORT).toEqualTypeOf<string>();
    });
  });

  // ─── TypeBox ────────────────────────────────────────────────────────

  describe('typebox object', () => {
    it('validates using Type.Object() directly', () => {
      const schema = Type.Object({
        HOST: Type.String(),
        PORT: Type.String(),
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000' } },
      );

      expect(env.HOST).toBe('localhost');
      expect(env.PORT).toBe('3000');
    });

    it('infers correct types from Type.Object()', () => {
      const schema = Type.Object({
        HOST: Type.String(),
        PORT: Type.Number(),
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000' } },
      );

      expectTypeOf(env.HOST).toEqualTypeOf<string>();
      expectTypeOf(env.PORT).toEqualTypeOf<number>();
    });
  });

  // ─── ArkType ────────────────────────────────────────────────────────

  describe('arktype object', () => {
    it('validates using type({}) directly', () => {
      const schema = type({
        HOST: 'string',
        PORT: 'string',
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000' } },
      );

      expect(env.HOST).toBe('localhost');
      expect(env.PORT).toBe('3000');
    });

    it('infers correct types from type({})', () => {
      const schema = type({
        HOST: 'string',
        PORT: 'string',
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000' } },
      );

      expectTypeOf(env.HOST).toEqualTypeOf<string>();
      expectTypeOf(env.PORT).toEqualTypeOf<string>();
    });
  });

  // ─── Superstruct ────────────────────────────────────────────────────

  describe('superstruct object', () => {
    it('validates using object() directly', () => {
      const schema = object({
        HOST: string(),
        PORT: string(),
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000' } },
      );

      expect(env.HOST).toBe('localhost');
      expect(env.PORT).toBe('3000');
    });

    it('infers correct types from object()', () => {
      const schema = object({
        HOST: string(),
        PORT: string(),
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000' } },
      );

      expectTypeOf(env.HOST).toEqualTypeOf<string>();
      expectTypeOf(env.PORT).toEqualTypeOf<string>();
    });
  });

  // ─── Runtypes ───────────────────────────────────────────────────────

  describe('runtypes object', () => {
    it('validates using Object() directly', () => {
      const schema = RtObject({
        HOST: RtString,
        PORT: RtString,
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000' } },
      );

      expect(env.HOST).toBe('localhost');
      expect(env.PORT).toBe('3000');
    });

    it('infers correct types from Object()', () => {
      const schema = RtObject({
        HOST: RtString,
        PORT: RtString,
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000' } },
      );

      expectTypeOf(env.HOST).toEqualTypeOf<string>();
      expectTypeOf(env.PORT).toEqualTypeOf<string>();
    });
  });

  // ─── Effect Schema ─────────────────────────────────────────────────

  describe('effect schema struct', () => {
    it('validates using Schema.Struct() directly', () => {
      const schema = Schema.Struct({
        HOST: Schema.String,
        PORT: Schema.String,
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000' } },
      );

      expect(env.HOST).toBe('localhost');
      expect(env.PORT).toBe('3000');
    });

    it('infers correct types from Schema.Struct()', () => {
      const schema = Schema.Struct({
        HOST: Schema.String,
        PORT: Schema.String,
      });

      const env = createEnv(
        { schema },
        { source: { HOST: 'localhost', PORT: '3000' } },
      );

      expectTypeOf(env.HOST).toEqualTypeOf<string>();
      expectTypeOf(env.PORT).toEqualTypeOf<string>();
    });
  });

  // ─── Prefix support ────────────────────────────────────────────────

  it('supports prefix with object-level schemas', () => {
    const schema = z.object({
      HOST: z.string(),
      PORT: z.coerce.number(),
    });

    const env = createEnv(
      { schema },
      {
        source: { MYAPP_HOST: 'localhost', MYAPP_PORT: '3000' },
        prefix: 'MYAPP_',
      },
    );

    expect(env.HOST).toBe('localhost');
    expect(env.PORT).toBe(3000);
  });

  // ─── Mixed: field-by-field still works ─────────────────────────────

  it('field-by-field mode still works alongside object schemas', () => {
    const env = createEnv(
      {
        schema: {
          HOST: z.string(),
          PORT: { type: 'number' as const },
        },
      },
      { source: { HOST: 'localhost', PORT: '3000' } },
    );

    expect(env.HOST).toBe('localhost');
    expect(env.PORT).toBe(3000);
    expectTypeOf(env.HOST).toEqualTypeOf<string>();
    expectTypeOf(env.PORT).toEqualTypeOf<number>();
  });
});
