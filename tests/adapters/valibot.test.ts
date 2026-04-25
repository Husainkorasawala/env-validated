import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { createEnv, EnvSafeError } from '../../src/index.js';

describe('valibot adapter', () => {
  it('validates a valibot string schema', () => {
    const env = createEnv(
      { schema: { NAME: v.string() } },
      { source: { NAME: 'hello' } },
    );
    expect(env.NAME).toBe('hello');
  });

  it('validates valibot string with minLength', () => {
    const env = createEnv(
      { schema: { NAME: v.pipe(v.string(), v.minLength(3)) } },
      { source: { NAME: 'hello' } },
    );
    expect(env.NAME).toBe('hello');
  });

  it('reports valibot validation errors', () => {
    expect(() =>
      createEnv(
        { schema: { NAME: v.pipe(v.string(), v.minLength(10)) } },
        { source: { NAME: 'hi' } },
      ),
    ).toThrow(EnvSafeError);
  });

  it('handles valibot picklist (enum)', () => {
    const env = createEnv(
      { schema: { ENV: v.picklist(['dev', 'prod', 'test']) } },
      { source: { ENV: 'prod' } },
    );
    expect(env.ENV).toBe('prod');
  });

  it('rejects missing required value', () => {
    expect(() =>
      createEnv({ schema: { NAME: v.string() } }, { source: {} }),
    ).toThrow(EnvSafeError);
  });
});
