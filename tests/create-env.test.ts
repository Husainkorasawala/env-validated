import { describe, expect, it } from 'vitest';
import { createEnv, EnvSafeError } from '../src/index.js';

describe('createEnv', () => {
  it('returns a frozen object', () => {
    const env = createEnv(
      { schema: { PORT: { type: 'number' as const, default: 3000 } } },
      { source: {} },
    );
    expect(Object.isFrozen(env)).toBe(true);
  });

  it('reads from custom source', () => {
    const env = createEnv(
      { schema: { HOST: { type: 'string' as const } } },
      { source: { HOST: 'localhost' } },
    );
    expect(env.HOST).toBe('localhost');
  });

  it('strips prefix from keys', () => {
    const env = createEnv(
      { schema: { API_URL: { type: 'url' as const } } },
      {
        source: { NEXT_PUBLIC_API_URL: 'https://example.com' },
        prefix: 'NEXT_PUBLIC_',
      },
    );
    expect(env.API_URL).toBe('https://example.com');
  });

  it('handles mixed built-in types', () => {
    const env = createEnv(
      {
        schema: {
          PORT: { type: 'number' as const, default: 3000 },
          DEBUG: { type: 'boolean' as const, default: false },
          NODE_ENV: {
            type: 'enum' as const,
            values: ['dev', 'prod'] as const,
          },
          API: { type: 'url' as const },
        },
      },
      {
        source: {
          PORT: '8080',
          NODE_ENV: 'prod',
          API: 'https://api.example.com',
        },
      },
    );
    expect(env.PORT).toBe(8080);
    expect(env.DEBUG).toBe(false);
    expect(env.NODE_ENV).toBe('prod');
    expect(env.API).toBe('https://api.example.com');
  });

  it('supports custom validate function', () => {
    const env = createEnv(
      {
        schema: {
          IPS: {
            validate: (val: string | undefined) => {
              if (!val) return { success: false as const, error: 'required' };
              const ips = val.split(',').map((s) => s.trim());
              const valid = ips.every((ip) =>
                /^\d{1,3}(\.\d{1,3}){3}$/.test(ip),
              );
              return valid
                ? { success: true as const, value: ips }
                : {
                    success: false as const,
                    error: 'must be comma-separated IPs',
                  };
            },
          },
        },
      },
      { source: { IPS: '192.168.1.1,10.0.0.1' } },
    );
    expect(env.IPS).toEqual(['192.168.1.1', '10.0.0.1']);
  });

  it('custom validate function error is collected', () => {
    expect(() =>
      createEnv(
        {
          schema: {
            IPS: {
              validate: (_val: string | undefined) => ({
                success: false as const,
                error: 'custom error msg',
              }),
            },
          },
        },
        { source: { IPS: 'bad' } },
      ),
    ).toThrow('custom error msg');
  });

  it('empty string is treated as missing', () => {
    expect(() =>
      createEnv(
        { schema: { NAME: { type: 'string' as const } } },
        { source: { NAME: '' } },
      ),
    ).toThrow('required');
  });

  it('EnvSafeError has the correct name', () => {
    try {
      createEnv({ schema: { X: { type: 'string' as const } } }, { source: {} });
      expect.fail('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(EnvSafeError);
      expect((e as EnvSafeError).name).toBe('EnvSafeError');
    }
  });
});
