import { type } from 'arktype';
import { describe, expect, it } from 'vitest';
import { createEnv, EnvSafeError } from '../../src/index.js';

describe('arktype adapter', () => {
  it('validates an arktype string schema', () => {
    const env = createEnv(
      { schema: { NAME: type('string') } },
      { source: { NAME: 'hello' } },
    );
    expect(env.NAME).toBe('hello');
  });

  it('validates arktype string with constraints', () => {
    const env = createEnv(
      { schema: { NAME: type('string >= 3') } },
      { source: { NAME: 'hello' } },
    );
    expect(env.NAME).toBe('hello');
  });

  it('reports arktype validation errors', () => {
    expect(() =>
      createEnv(
        { schema: { NUM: type('number') } },
        { source: { NUM: 'not-a-number' } },
      ),
    ).toThrow(EnvSafeError);
  });

  it('handles arktype union', () => {
    const env = createEnv(
      { schema: { ENV: type("'dev' | 'prod' | 'test'") } },
      { source: { ENV: 'prod' } },
    );
    expect(env.ENV).toBe('prod');
  });
});
