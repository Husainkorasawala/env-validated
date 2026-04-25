import Joi from 'joi';
import { describe, expect, it } from 'vitest';
import { createEnv, EnvSafeError } from '../../src/index.js';

describe('joi adapter', () => {
  it('validates a joi string schema', () => {
    const env = createEnv(
      { schema: { NAME: Joi.string().min(3).required() } },
      { source: { NAME: 'hello' } },
    );
    expect(env.NAME).toBe('hello');
  });

  it('validates joi number with coercion', () => {
    const env = createEnv(
      { schema: { PORT: Joi.number().min(1000).required() } },
      { source: { PORT: '3000' } },
    );
    expect(env.PORT).toBe(3000);
  });

  it('reports joi validation errors', () => {
    expect(() =>
      createEnv(
        { schema: { PORT: Joi.number().min(1000).required() } },
        { source: { PORT: '80' } },
      ),
    ).toThrow(EnvSafeError);
  });

  it('handles joi string valid (enum-like)', () => {
    const env = createEnv(
      {
        schema: {
          ENV: Joi.string().valid('dev', 'prod', 'test').required(),
        },
      },
      { source: { ENV: 'prod' } },
    );
    expect(env.ENV).toBe('prod');
  });

  it('handles optional joi fields', () => {
    const env = createEnv(
      { schema: { OPT: Joi.string().optional().default('fallback') } },
      { source: {} },
    );
    expect(env.OPT).toBe('fallback');
  });
});
