import { Literal, String as RtString, Union } from 'runtypes';
import { describe, expect, it } from 'vitest';
import { createEnv, EnvSafeError } from '../../src/index.js';

describe('runtypes adapter', () => {
  it('validates a runtypes string schema', () => {
    const env = createEnv(
      { schema: { NAME: RtString } },
      { source: { NAME: 'hello' } },
    );
    expect(env.NAME).toBe('hello');
  });

  it('validates runtypes string with constraint', () => {
    const env = createEnv(
      {
        schema: {
          NAME: RtString.withConstraint(
            (s) => s.length >= 3 || 'must be at least 3 characters',
          ),
        },
      },
      { source: { NAME: 'hello' } },
    );
    expect(env.NAME).toBe('hello');
  });

  it('reports runtypes validation errors', () => {
    expect(() =>
      createEnv(
        {
          schema: {
            NAME: RtString.withConstraint(
              (s) => s.length >= 10 || 'must be at least 10 characters',
            ),
          },
        },
        { source: { NAME: 'hi' } },
      ),
    ).toThrow(EnvSafeError);
  });

  it('handles runtypes union (enum-like)', () => {
    const env = createEnv(
      {
        schema: {
          ENV: Union(Literal('dev'), Literal('prod'), Literal('test')),
        },
      },
      { source: { ENV: 'prod' } },
    );
    expect(env.ENV).toBe('prod');
  });

  it('rejects invalid runtypes union value', () => {
    expect(() =>
      createEnv(
        {
          schema: {
            ENV: Union(Literal('dev'), Literal('prod')),
          },
        },
        { source: { ENV: 'staging' } },
      ),
    ).toThrow(EnvSafeError);
  });
});
