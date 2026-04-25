import { enums, size, string } from 'superstruct';
import { describe, expect, it } from 'vitest';
import { createEnv, EnvSafeError } from '../../src/index.js';

describe('superstruct adapter', () => {
  it('validates a superstruct string schema', () => {
    const env = createEnv(
      { schema: { NAME: string() } },
      { source: { NAME: 'hello' } },
    );
    expect(env.NAME).toBe('hello');
  });

  it('validates superstruct string with size constraint', () => {
    const env = createEnv(
      { schema: { NAME: size(string(), 3, 50) } },
      { source: { NAME: 'hello' } },
    );
    expect(env.NAME).toBe('hello');
  });

  it('reports superstruct validation errors', () => {
    expect(() =>
      createEnv(
        { schema: { NAME: size(string(), 10, 50) } },
        { source: { NAME: 'hi' } },
      ),
    ).toThrow(EnvSafeError);
  });

  it('handles superstruct enums', () => {
    const env = createEnv(
      { schema: { ENV: enums(['dev', 'prod', 'test']) } },
      { source: { ENV: 'prod' } },
    );
    expect(env.ENV).toBe('prod');
  });
});
