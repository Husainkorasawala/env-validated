import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createEnv, EnvSafeError } from '../../src/index.js';

describe('zod adapter', () => {
  it('validates a zod string schema', () => {
    const env = createEnv(
      { schema: { NAME: z.string().min(3) } },
      { source: { NAME: 'hello' } },
    );
    expect(env.NAME).toBe('hello');
  });

  it('validates zod coerce number', () => {
    const env = createEnv(
      { schema: { PORT: z.coerce.number().min(1000) } },
      { source: { PORT: '3000' } },
    );
    expect(env.PORT).toBe(3000);
  });

  it('reports zod validation errors', () => {
    expect(() =>
      createEnv(
        { schema: { PORT: z.coerce.number().min(1000) } },
        { source: { PORT: '80' } },
      ),
    ).toThrow(EnvSafeError);
  });

  it('handles zod enum', () => {
    const env = createEnv(
      { schema: { ENV: z.enum(['dev', 'prod', 'test']) } },
      { source: { ENV: 'prod' } },
    );
    expect(env.ENV).toBe('prod');
  });

  it('handles zod transform', () => {
    const env = createEnv(
      {
        schema: {
          TAGS: z.string().transform((s) => s.split(',')),
        },
      },
      { source: { TAGS: 'a,b,c' } },
    );
    expect(env.TAGS).toEqual(['a', 'b', 'c']);
  });

  it('reports error when value is missing and zod requires it', () => {
    expect(() =>
      createEnv({ schema: { REQUIRED: z.string().min(1) } }, { source: {} }),
    ).toThrow(EnvSafeError);
  });
});
