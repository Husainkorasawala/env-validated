import { Type } from '@sinclair/typebox';
import { describe, expect, it } from 'vitest';
import { createEnv, EnvSafeError } from '../../src/index.js';

describe('typebox adapter', () => {
  it('validates a typebox string schema', () => {
    const env = createEnv(
      { schema: { NAME: Type.String() } },
      { source: { NAME: 'hello' } },
    );
    expect(env.NAME).toBe('hello');
  });

  it('coerces and validates typebox number', () => {
    const env = createEnv(
      { schema: { PORT: Type.Number() } },
      { source: { PORT: '3000' } },
    );
    expect(env.PORT).toBe(3000);
  });

  it('validates typebox string with minLength', () => {
    const env = createEnv(
      { schema: { NAME: Type.String({ minLength: 3 }) } },
      { source: { NAME: 'hello' } },
    );
    expect(env.NAME).toBe('hello');
  });

  it('reports typebox validation errors', () => {
    expect(() =>
      createEnv(
        { schema: { NAME: Type.String({ minLength: 10 }) } },
        { source: { NAME: 'hi' } },
      ),
    ).toThrow(EnvSafeError);
  });

  it('handles typebox boolean', () => {
    const env = createEnv(
      { schema: { FLAG: Type.Boolean() } },
      { source: { FLAG: 'true' } },
    );
    expect(env.FLAG).toBe(true);
  });
});
