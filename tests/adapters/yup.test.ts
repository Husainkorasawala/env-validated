import { describe, expect, it } from 'vitest';
import * as yup from 'yup';
import { createEnv, EnvSafeError } from '../../src/index.js';

describe('yup adapter', () => {
  it('validates a yup string schema', () => {
    const env = createEnv(
      { schema: { NAME: yup.string().required().min(3) } },
      { source: { NAME: 'hello' } },
    );
    expect(env.NAME).toBe('hello');
  });

  it('pre-coerces string to number for yup number schema', () => {
    const env = createEnv(
      { schema: { PORT: yup.number().required().min(1000) } },
      { source: { PORT: '3000' } },
    );
    expect(env.PORT).toBe(3000);
  });

  it('pre-coerces string to boolean for yup boolean schema', () => {
    const env = createEnv(
      { schema: { FLAG: yup.boolean().required() } },
      { source: { FLAG: 'true' } },
    );
    expect(env.FLAG).toBe(true);
  });

  it('reports yup validation errors', () => {
    expect(() =>
      createEnv(
        { schema: { PORT: yup.number().required().min(1000) } },
        { source: { PORT: '80' } },
      ),
    ).toThrow(EnvSafeError);
  });

  it('handles yup oneOf (enum-like)', () => {
    const env = createEnv(
      {
        schema: {
          ENV: yup.string().required().oneOf(['dev', 'prod', 'test']),
        },
      },
      { source: { ENV: 'prod' } },
    );
    expect(env.ENV).toBe('prod');
  });
});
