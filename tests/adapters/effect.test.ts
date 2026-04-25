import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { createEnv, EnvSafeError } from '../../src/index.js';

describe('effect schema adapter', () => {
  it('validates an effect string schema', () => {
    const env = createEnv(
      { schema: { NAME: Schema.String } },
      { source: { NAME: 'hello' } },
    );
    expect(env.NAME).toBe('hello');
  });

  it('validates effect string with minLength', () => {
    const env = createEnv(
      {
        schema: {
          NAME: Schema.String.pipe(Schema.minLength(3)),
        },
      },
      { source: { NAME: 'hello' } },
    );
    expect(env.NAME).toBe('hello');
  });

  it('reports effect validation errors', () => {
    expect(() =>
      createEnv(
        {
          schema: {
            NAME: Schema.String.pipe(Schema.minLength(10)),
          },
        },
        { source: { NAME: 'hi' } },
      ),
    ).toThrow(EnvSafeError);
  });

  it('handles effect literal union', () => {
    const env = createEnv(
      {
        schema: {
          ENV: Schema.Literal('dev', 'prod', 'test'),
        },
      },
      { source: { ENV: 'prod' } },
    );
    expect(env.ENV).toBe('prod');
  });
});
