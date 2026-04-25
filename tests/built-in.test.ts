import { describe, expect, it } from 'vitest';
import { createEnv, EnvSafeError } from '../src/index.js';

describe('built-in validators', () => {
  // ─── String ─────────────────────────────────────────────────────
  describe('string', () => {
    it('passes valid string', () => {
      const env = createEnv(
        { schema: { NAME: { type: 'string' as const } } },
        { source: { NAME: 'hello' } },
      );
      expect(env.NAME).toBe('hello');
    });

    it('throws when required string is missing', () => {
      expect(() =>
        createEnv(
          { schema: { NAME: { type: 'string' as const } } },
          { source: {} },
        ),
      ).toThrow(EnvSafeError);
    });

    it('uses default when missing', () => {
      const env = createEnv(
        {
          schema: {
            NAME: { type: 'string' as const, default: 'world' },
          },
        },
        { source: {} },
      );
      expect(env.NAME).toBe('world');
    });

    it('validates minLength', () => {
      expect(() =>
        createEnv(
          {
            schema: {
              KEY: { type: 'string' as const, minLength: 10 },
            },
          },
          { source: { KEY: 'short' } },
        ),
      ).toThrow('at least 10 characters');
    });

    it('validates maxLength', () => {
      expect(() =>
        createEnv(
          {
            schema: {
              KEY: { type: 'string' as const, maxLength: 3 },
            },
          },
          { source: { KEY: 'toolong' } },
        ),
      ).toThrow('at most 3 characters');
    });

    it('validates pattern', () => {
      expect(() =>
        createEnv(
          {
            schema: {
              KEY: { type: 'string' as const, pattern: /^[A-Z]+$/ },
            },
          },
          { source: { KEY: 'lowercase' } },
        ),
      ).toThrow('must match pattern');
    });

    it('allows optional string to be undefined', () => {
      const env = createEnv(
        {
          schema: {
            NAME: { type: 'string' as const, required: false as const },
          },
        },
        { source: {} },
      );
      expect(env.NAME).toBeUndefined();
    });
  });

  // ─── Number ─────────────────────────────────────────────────────
  describe('number', () => {
    it('coerces string to number', () => {
      const env = createEnv(
        { schema: { PORT: { type: 'number' as const } } },
        { source: { PORT: '3000' } },
      );
      expect(env.PORT).toBe(3000);
    });

    it('throws on non-numeric string', () => {
      expect(() =>
        createEnv(
          { schema: { PORT: { type: 'number' as const } } },
          { source: { PORT: 'abc' } },
        ),
      ).toThrow('must be a number');
    });

    it('validates min', () => {
      expect(() =>
        createEnv(
          { schema: { PORT: { type: 'number' as const, min: 1000 } } },
          { source: { PORT: '80' } },
        ),
      ).toThrow('>= 1000');
    });

    it('validates max', () => {
      expect(() =>
        createEnv(
          { schema: { PORT: { type: 'number' as const, max: 100 } } },
          { source: { PORT: '200' } },
        ),
      ).toThrow('<= 100');
    });

    it('uses default', () => {
      const env = createEnv(
        { schema: { PORT: { type: 'number' as const, default: 3000 } } },
        { source: {} },
      );
      expect(env.PORT).toBe(3000);
    });
  });

  // ─── Boolean ────────────────────────────────────────────────────
  describe('boolean', () => {
    it.each([
      ['true', true],
      ['false', false],
      ['1', true],
      ['0', false],
      ['yes', true],
      ['no', false],
      ['TRUE', true],
      ['FALSE', false],
    ])('parses "%s" as %s', (input, expected) => {
      const env = createEnv(
        { schema: { FLAG: { type: 'boolean' as const } } },
        { source: { FLAG: input } },
      );
      expect(env.FLAG).toBe(expected);
    });

    it('throws on invalid boolean', () => {
      expect(() =>
        createEnv(
          { schema: { FLAG: { type: 'boolean' as const } } },
          { source: { FLAG: 'maybe' } },
        ),
      ).toThrow('must be a boolean');
    });
  });

  // ─── URL ────────────────────────────────────────────────────────
  describe('url', () => {
    it('accepts valid URLs', () => {
      const env = createEnv(
        { schema: { API: { type: 'url' as const } } },
        { source: { API: 'https://example.com/api' } },
      );
      expect(env.API).toBe('https://example.com/api');
    });

    it('rejects invalid URLs', () => {
      expect(() =>
        createEnv(
          { schema: { API: { type: 'url' as const } } },
          { source: { API: 'not-a-url' } },
        ),
      ).toThrow('must be a valid URL');
    });
  });

  // ─── Port ───────────────────────────────────────────────────────
  describe('port', () => {
    it('accepts valid ports', () => {
      const env = createEnv(
        { schema: { PORT: { type: 'port' as const } } },
        { source: { PORT: '8080' } },
      );
      expect(env.PORT).toBe(8080);
    });

    it('rejects port 0', () => {
      expect(() =>
        createEnv(
          { schema: { PORT: { type: 'port' as const } } },
          { source: { PORT: '0' } },
        ),
      ).toThrow('valid port');
    });

    it('rejects port > 65535', () => {
      expect(() =>
        createEnv(
          { schema: { PORT: { type: 'port' as const } } },
          { source: { PORT: '99999' } },
        ),
      ).toThrow('valid port');
    });

    it('rejects non-integer port', () => {
      expect(() =>
        createEnv(
          { schema: { PORT: { type: 'port' as const } } },
          { source: { PORT: 'abc' } },
        ),
      ).toThrow('valid port');
    });
  });

  // ─── Enum ───────────────────────────────────────────────────────
  describe('enum', () => {
    it('accepts valid enum value', () => {
      const env = createEnv(
        {
          schema: {
            NODE_ENV: {
              type: 'enum' as const,
              values: ['development', 'production', 'test'] as const,
            },
          },
        },
        { source: { NODE_ENV: 'production' } },
      );
      expect(env.NODE_ENV).toBe('production');
    });

    it('rejects invalid enum value', () => {
      expect(() =>
        createEnv(
          {
            schema: {
              NODE_ENV: {
                type: 'enum' as const,
                values: ['development', 'production', 'test'] as const,
              },
            },
          },
          { source: { NODE_ENV: 'staging' } },
        ),
      ).toThrow('must be one of');
    });
  });

  // ─── JSON ───────────────────────────────────────────────────────
  describe('json', () => {
    it('parses valid JSON', () => {
      const env = createEnv(
        { schema: { CONFIG: { type: 'json' as const } } },
        { source: { CONFIG: '{"key":"value"}' } },
      );
      expect(env.CONFIG).toEqual({ key: 'value' });
    });

    it('rejects invalid JSON', () => {
      expect(() =>
        createEnv(
          { schema: { CONFIG: { type: 'json' as const } } },
          { source: { CONFIG: 'not json' } },
        ),
      ).toThrow('must be valid JSON');
    });
  });
});
