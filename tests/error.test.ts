import { describe, expect, it, vi } from 'vitest';
import { createEnv, EnvSafeError } from '../src/index.js';

describe('error handling', () => {
  it('collects all errors before throwing (not fail-fast)', () => {
    try {
      createEnv(
        {
          schema: {
            A: { type: 'number' as const },
            B: { type: 'url' as const },
            C: { type: 'boolean' as const },
          },
        },
        { source: { A: 'abc', B: 'not-url', C: 'maybe' } },
      );
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(EnvSafeError);
      const err = e as EnvSafeError;
      expect(err.errors).toHaveLength(3);
      expect(err.errors[0]?.key).toBe('A');
      expect(err.errors[1]?.key).toBe('B');
      expect(err.errors[2]?.key).toBe('C');
    }
  });

  it('includes all missing required fields', () => {
    try {
      createEnv(
        {
          schema: {
            X: { type: 'string' as const },
            Y: { type: 'number' as const },
          },
        },
        { source: {} },
      );
      expect.fail('should have thrown');
    } catch (e) {
      const err = e as EnvSafeError;
      expect(err.errors).toHaveLength(2);
      expect(err.errors[0]?.message).toContain('required');
      expect(err.errors[1]?.message).toContain('required');
    }
  });

  it('formats error message with header and footer', () => {
    try {
      createEnv(
        { schema: { MISSING: { type: 'string' as const } } },
        { source: {} },
      );
      expect.fail('should have thrown');
    } catch (e) {
      const err = e as EnvSafeError;
      expect(err.message).toContain('[env-validated]');
      expect(err.message).toContain('MISSING');
      expect(err.message).toContain('Fix these before starting the app');
    }
  });

  it('redacts sensitive values in error messages', () => {
    try {
      createEnv(
        {
          schema: {
            API_KEY: { type: 'string' as const, minLength: 32 },
            DB_PASSWORD: { type: 'string' as const, minLength: 32 },
            AUTH_TOKEN: { type: 'string' as const, minLength: 32 },
            MY_SECRET: { type: 'string' as const, minLength: 32 },
          },
        },
        {
          source: {
            API_KEY: 'short',
            DB_PASSWORD: 'short',
            AUTH_TOKEN: 'short',
            MY_SECRET: 'short',
          },
        },
      );
      expect.fail('should have thrown');
    } catch (e) {
      const err = e as EnvSafeError;
      // The actual values should be redacted
      expect(err.message).not.toContain('short');
    }
  });

  it('does not redact non-sensitive values', () => {
    try {
      createEnv(
        {
          schema: {
            PORT: { type: 'number' as const },
          },
        },
        { source: { PORT: 'not-a-number' } },
      );
      expect.fail('should have thrown');
    } catch (e) {
      const err = e as EnvSafeError;
      expect(err.message).toContain('not-a-number');
    }
  });

  it('onError: "warn" logs but does not throw', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createEnv(
      { schema: { MISSING: { type: 'string' as const } } },
      { source: {}, onError: 'warn' },
    );
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0]?.[0]).toContain('[env-validated]');
    warnSpy.mockRestore();
  });

  it('onError: function receives the error', () => {
    let received: EnvSafeError | undefined;
    createEnv(
      { schema: { MISSING: { type: 'string' as const } } },
      {
        source: {},
        onError: (err) => {
          received = err;
        },
      },
    );
    expect(received).toBeInstanceOf(EnvSafeError);
    expect(received?.errors).toHaveLength(1);
  });
});
