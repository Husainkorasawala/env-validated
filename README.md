# env-validated

**Framework-agnostic environment variable validation with pluggable validators, zero dependencies, and full TypeScript inference.**

Validate your env vars at startup. Get a fully typed, frozen config object. Never touch `process.env` directly again.

[![npm version](https://img.shields.io/npm/v/env-validated.svg)](https://www.npmjs.com/package/env-validated)
[![license](https://img.shields.io/npm/l/env-validated.svg)](https://github.com/husainkorasawala/env-validated/blob/main/LICENSE)

---

## Why env-validated?

Every project solves environment validation from scratch. Existing solutions are either locked to a specific validator (t3-env requires Zod), lack TypeScript inference (envalid), or can't work across different runtimes.

env-validated fills all three gaps at once:

- **Zero dependencies** &mdash; the core package has no runtime dependencies
- **Full TypeScript inference** &mdash; no type casting, no manual type declarations
- **Pluggable validators** &mdash; use Zod, Joi, Yup, Valibot, or 5 other libraries via auto-detected adapters
- **Object schemas** &mdash; pass a pre-defined `z.object()`, `yup.object()`, etc. directly
- **Any runtime** &mdash; Node.js, Vite, Next.js, Deno, Cloudflare Workers, CLI tools
- **Mix and match** &mdash; use different validators per field in the same schema

## Install

```bash
npm install env-validated
```

## Quick Start

```ts
import { createEnv } from 'env-validated'

export const env = createEnv({
  schema: {
    API_URL:        { type: 'url',     required: true },
    PORT:           { type: 'number',  default: 3000 },
    NODE_ENV:       { type: 'enum',    values: ['development', 'production', 'test'] as const },
    ENABLE_FEATURE: { type: 'boolean', default: false },
    SECRET_KEY:     { type: 'string',  required: true, minLength: 32 },
  }
})

// Fully typed - no casting needed:
env.PORT           // number
env.ENABLE_FEATURE // boolean
env.NODE_ENV       // 'development' | 'production' | 'test'
env.API_URL        // string
```

If any variable is missing or invalid, env-validated throws a single clear error listing every problem:

```
[env-validated] Missing or invalid environment variables:
  ✖ API_URL     — required, was not set
  ✖ SECRET_KEY  — must be at least 32 characters (got 12)
  ✖ NODE_ENV    — must be one of: development, production, test (got "staging")
  ✖ PORT        — must be a number (got "not-a-number")

Fix these before starting the app.
```

## Built-in Types

env-validated ships with lightweight validators for the most common types:

| Type | Output Type | Options | Description |
|------|------------|---------|-------------|
| `string` | `string` | `required`, `minLength`, `maxLength`, `pattern` | Plain string validation |
| `number` | `number` | `required`, `min`, `max`, `default` | Coerces string to number |
| `boolean` | `boolean` | `required`, `default` | Parses `true`/`false`/`1`/`0`/`yes`/`no` |
| `url` | `string` | `required`, `default` | Validates URL format |
| `enum` | union type | `values`, `required`, `default` | Must match one of `values[]` |
| `json` | `unknown` | `required`, `default` | Parses and validates JSON strings |
| `port` | `number` | `required`, `default` | Validates port range 1&ndash;65535 |

```ts
const env = createEnv({
  schema: {
    DB_HOST:  { type: 'string', default: 'localhost' },
    DB_PORT:  { type: 'port',   default: 5432 },
    LOG_JSON: { type: 'boolean', default: false },
    REGION:   { type: 'enum', values: ['us-east', 'eu-west'] as const },
    METADATA: { type: 'json' },
  }
})
```

## Pluggable Validators

env-validated auto-detects which validator library a schema field belongs to. No adapter imports or configuration needed &mdash; just pass the schema object directly.

### Zod

```bash
npm install zod
```

```ts
import { createEnv } from 'env-validated'
import { z } from 'zod'

const env = createEnv({
  schema: {
    PORT: z.coerce.number().min(1000),
    TAGS: z.string().transform(s => s.split(',')),
    ENV:  z.enum(['dev', 'prod', 'test']),
  }
})

env.PORT // number
env.TAGS // string[]
env.ENV  // 'dev' | 'prod' | 'test'
```

### Joi

```bash
npm install joi
```

```ts
import { createEnv } from 'env-validated'
import Joi from 'joi'

const env = createEnv({
  schema: {
    PORT: Joi.number().min(1000).required(),
    NAME: Joi.string().min(3).required(),
    ENV:  Joi.string().valid('dev', 'prod', 'test').required(),
  }
})

env.PORT // number
env.NAME // string
env.ENV  // string
```

Joi's type system carries schema types through structural matching, so `Joi.string()` infers `string`, `Joi.number()` infers `number`, and `Joi.boolean()` infers `boolean` automatically.

### Yup

```bash
npm install yup
```

```ts
import { createEnv } from 'env-validated'
import * as yup from 'yup'

const env = createEnv({
  schema: {
    PORT: yup.number().required().min(1000),
    NAME: yup.string().required().min(3),
    FLAG: yup.boolean().required(),
  }
})

env.PORT // number
env.FLAG // boolean
```

The Yup adapter pre-coerces string values to `number` or `boolean` based on the schema type, so you don't need `.transform()`.

### Valibot

```bash
npm install valibot
```

```ts
import { createEnv } from 'env-validated'
import * as v from 'valibot'

const env = createEnv({
  schema: {
    NAME: v.pipe(v.string(), v.minLength(3)),
    ENV:  v.picklist(['dev', 'prod', 'test']),
  }
})

env.NAME // string
env.ENV  // 'dev' | 'prod' | 'test'
```

### TypeBox

```bash
npm install @sinclair/typebox
```

```ts
import { createEnv } from 'env-validated'
import { Type } from '@sinclair/typebox'

const env = createEnv({
  schema: {
    PORT: Type.Number(),
    NAME: Type.String({ minLength: 3 }),
    FLAG: Type.Boolean(),
  }
})

env.PORT // number
env.FLAG // boolean
```

TypeBox values are automatically coerced from strings using `Value.Convert`.

### ArkType

```bash
npm install arktype
```

```ts
import { createEnv } from 'env-validated'
import { type } from 'arktype'

const env = createEnv({
  schema: {
    NAME: type('string >= 3'),
    ENV:  type("'dev' | 'prod' | 'test'"),
  }
})
```

### Superstruct

```bash
npm install superstruct
```

```ts
import { createEnv } from 'env-validated'
import { string, size, enums } from 'superstruct'

const env = createEnv({
  schema: {
    NAME: size(string(), 3, 100),
    ENV:  enums(['dev', 'prod', 'test']),
  }
})
```

### Runtypes

```bash
npm install runtypes
```

```ts
import { createEnv } from 'env-validated'
import { String, Union, Literal } from 'runtypes'

const env = createEnv({
  schema: {
    NAME: String.withConstraint(s => s.length >= 3 || 'too short'),
    ENV:  Union(Literal('dev'), Literal('prod'), Literal('test')),
  }
})
```

### Effect Schema

```bash
npm install effect
```

For older setups that only use the standalone package, install `@effect/schema` instead; env-validated supports both as optional peers.

```ts
import { createEnv } from 'env-validated'
import { Schema } from 'effect'

const env = createEnv({
  schema: {
    NAME: Schema.String.pipe(Schema.minLength(3)),
    ENV:  Schema.Literal('dev', 'prod', 'test'),
  }
})
```

## Object-Level Schemas

If you already have a pre-defined object schema from any validator library, you can pass it directly to `createEnv` instead of defining fields individually. Types are inferred automatically.

### Zod

```ts
import { z } from 'zod'

const envSchema = z.object({
  HOST: z.string(),
  PORT: z.coerce.number(),
  DEBUG: z.coerce.boolean(),
})

const env = createEnv({ schema: envSchema })

env.HOST  // string
env.PORT  // number
env.DEBUG // boolean
```

### Yup

```ts
import * as yup from 'yup'

const envSchema = yup.object({
  HOST: yup.string().required(),
  PORT: yup.number().required(),
})

const env = createEnv({ schema: envSchema })

env.HOST // string
env.PORT // number
```

### Valibot

```ts
import * as v from 'valibot'

const envSchema = v.object({
  HOST: v.string(),
  PORT: v.string(),
})

const env = createEnv({ schema: envSchema })

env.HOST // string
env.PORT // string
```

### TypeBox

```ts
import { Type } from '@sinclair/typebox'

const envSchema = Type.Object({
  HOST: Type.String(),
  PORT: Type.Number(),
})

const env = createEnv({ schema: envSchema })

env.HOST // string
env.PORT // number
```

### ArkType

```ts
import { type } from 'arktype'

const envSchema = type({
  HOST: 'string',
  PORT: 'string',
})

const env = createEnv({ schema: envSchema })

env.HOST // string
env.PORT // string
```

### Superstruct

```ts
import { object, string } from 'superstruct'

const envSchema = object({
  HOST: string(),
  PORT: string(),
})

const env = createEnv({ schema: envSchema })

env.HOST // string
env.PORT // string
```

### Runtypes

```ts
import { Object, String } from 'runtypes'

const envSchema = Object({
  HOST: String,
  PORT: String,
})

const env = createEnv({ schema: envSchema })

env.HOST // string
env.PORT // string
```

### Effect Schema

```ts
import { Schema } from 'effect'

const envSchema = Schema.Struct({
  HOST: Schema.String,
  PORT: Schema.String,
})

const env = createEnv({ schema: envSchema })

env.HOST // string
env.PORT // string
```

### Joi

Joi's type definitions don't preserve inner schema types in `Joi.object()`. Use the `joiObject()` wrapper for full type inference &mdash; no manual annotations needed:

```ts
import Joi from 'joi'
import { joiObject } from 'env-validated/adapters/joi'

const env = createEnv({
  schema: joiObject({
    HOST:  Joi.string().required(),
    PORT:  Joi.number().min(1000).required(),
    DEBUG: Joi.boolean().default(false),
  }),
})

env.HOST  // string
env.PORT  // number
env.DEBUG // boolean
```

> **Why the wrapper?** `Joi.object<TSchema = any>()` erases inner schema types at the TypeScript level &mdash; this is a Joi limitation. `joiObject()` preserves them by attaching a phantom type that the inference engine reads. No manual type annotations are required; it infers `string`, `number`, `boolean`, and `Date` from the Joi schema methods automatically.

## Mixing Validators

You can use different validators for different fields in the same schema:

```ts
import { createEnv } from 'env-validated'
import { z } from 'zod'
import Joi from 'joi'

const env = createEnv({
  schema: {
    // Zod
    PORT: z.coerce.number().min(1000),

    // Joi
    API_KEY: Joi.string().min(32).required(),

    // Built-in
    NODE_ENV: { type: 'enum', values: ['dev', 'prod'] as const },

    // Custom validate function
    ALLOWED_IPS: {
      validate: (val) => {
        if (!val) return { success: false, error: 'required' }
        const ips = val.split(',').map(s => s.trim())
        const valid = ips.every(ip => /^\d{1,3}(\.\d{1,3}){3}$/.test(ip))
        return valid
          ? { success: true, value: ips }
          : { success: false, error: 'Must be comma-separated IPs' }
      }
    },
  }
})
```

## Custom Validate Function

For one-off fields that don't need a full library, pass an object with a `validate` function:

```ts
const env = createEnv({
  schema: {
    CSV_LIST: {
      validate: (val) => {
        if (!val) return { success: false, error: 'required' }
        const items = val.split(',').map(s => s.trim())
        return { success: true, value: items }
      }
    }
  }
})
// env.CSV_LIST is inferred as string[]
```

The `validate` function receives the raw string (or `undefined` if not set) and must return either:
- `{ success: true, value: T }` on success
- `{ success: false, error: string }` on failure

The return type `T` is inferred automatically &mdash; no manual type annotations needed.

## Framework Guides

### Node.js / Express / Fastify

No configuration needed. env-validated reads `process.env` by default.

```ts
// src/env.ts
import { createEnv } from 'env-validated'

export const env = createEnv({
  schema: {
    PORT:         { type: 'port', default: 3000 },
    DATABASE_URL: { type: 'url' },
    NODE_ENV:     { type: 'enum', values: ['development', 'production', 'test'] as const },
  }
})

// src/app.ts
import { env } from './env.js'
app.listen(env.PORT)
```

### Next.js

```ts
// src/env.ts
import { createEnv } from 'env-validated'

// Server-side env vars
export const env = createEnv({
  schema: {
    DATABASE_URL: { type: 'url' },
    API_SECRET:   { type: 'string', minLength: 32 },
  }
})

// Client-side env vars (with prefix stripping)
export const clientEnv = createEnv(
  {
    schema: {
      API_URL:     { type: 'url' },
      APP_NAME:    { type: 'string' },
    }
  },
  { source: process.env, prefix: 'NEXT_PUBLIC_' }
)
```

### Vite

```ts
import { createEnv } from 'env-validated'

export const env = createEnv(
  {
    schema: {
      API_URL: { type: 'url' },
      DEBUG:   { type: 'boolean', default: false },
    }
  },
  { source: import.meta.env, prefix: 'VITE_' }
)
```

### Remix

```ts
// app/env.server.ts
import { createEnv } from 'env-validated'

export const env = createEnv({
  schema: {
    DATABASE_URL:  { type: 'url' },
    SESSION_SECRET: { type: 'string', minLength: 32 },
  }
})
```

### Cloudflare Workers

```ts
// In your fetch handler
export default {
  async fetch(request: Request, cfEnv: Env) {
    const env = createEnv(
      {
        schema: {
          API_KEY:  { type: 'string', minLength: 16 },
          REGION:   { type: 'enum', values: ['us', 'eu'] as const },
        }
      },
      { source: cfEnv as Record<string, string> }
    )

    // env.API_KEY is typed and validated
  }
}
```

### Deno

```ts
import { createEnv } from 'env-validated'

const env = createEnv(
  {
    schema: {
      PORT: { type: 'port', default: 8000 },
      ENV:  { type: 'enum', values: ['dev', 'prod'] as const },
    }
  },
  { source: Deno.env.toObject() }
)
```

### NestJS

```ts
// src/env.ts
import { createEnv } from 'env-validated'

export const env = createEnv({
  schema: {
    PORT:         { type: 'port', default: 3000 },
    DATABASE_URL: { type: 'url' },
  }
})

// src/app.module.ts
import { env } from './env.js'

@Module({
  imports: [
    TypeOrmModule.forRoot({ url: env.DATABASE_URL }),
  ],
})
export class AppModule {}
```

### Testing (Jest / Vitest)

Pass a plain object as `source` for full isolation:

```ts
import { createEnv } from 'env-validated'

const env = createEnv(
  {
    schema: {
      API_URL: { type: 'url' },
      PORT:    { type: 'port', default: 3000 },
    }
  },
  {
    source: {
      API_URL: 'https://test.example.com',
      PORT: '4000',
    }
  }
)
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `source` | `Record<string, string \| undefined>` | `process.env` | Custom env source |
| `onError` | `'throw' \| 'warn' \| (err: EnvSafeError) => void` | `'throw'` | Error handling strategy |
| `dotenv` | `boolean \| string` | `undefined` | Auto-load `.env` file (requires `dotenv` installed) |
| `prefix` | `string` | `undefined` | Strip prefix from env keys (e.g. `'VITE_'`, `'NEXT_PUBLIC_'`) |

### Error Handling

```ts
// Default: throws EnvSafeError with all failures
createEnv({ schema: { ... } })

// Warn to console instead of throwing
createEnv({ schema: { ... } }, { onError: 'warn' })

// Custom handler
createEnv({ schema: { ... } }, {
  onError: (err) => {
    logger.error(err.message)
    process.exit(1)
  }
})

// Catch programmatically
import { createEnv, EnvSafeError } from 'env-validated'

try {
  const env = createEnv({ schema: { ... } })
} catch (e) {
  if (e instanceof EnvSafeError) {
    console.log(e.errors) // [{ key: 'PORT', message: '...' }, ...]
  }
}
```

## Secret Redaction

Variables whose names end with `_KEY`, `_SECRET`, `_TOKEN`, `_PASSWORD`, or `_PASS` are automatically masked in error output. Their values are never printed to the console.

```
[env-validated] Missing or invalid environment variables:
  ✖ API_KEY     — must be at least 32 characters (got *****)
  ✖ DB_PASSWORD — required, was not set
```

The actual value is still validated normally.

## TypeScript Inference

Types are inferred automatically from the schema. No type casting or manual type declarations needed.

**Built-in types:**

```ts
const env = createEnv({
  schema: {
    PORT:    { type: 'number',  default: 3000 },
    DRY_RUN: { type: 'boolean', default: false },
    ENV:     { type: 'enum',    values: ['dev', 'prod'] as const },
  }
})

env.PORT     // number
env.DRY_RUN  // boolean
env.ENV      // 'dev' | 'prod'
```

**External validators** &mdash; types pass through natively:

```ts
import { z } from 'zod'

const env = createEnv({
  schema: {
    COUNT: z.coerce.number().int().positive(),
    TAGS:  z.string().transform(s => s.split(',')),
  }
})

env.COUNT // number
env.TAGS  // string[]
```

**Custom validate functions** &mdash; return type is inferred:

```ts
const env = createEnv({
  schema: {
    IPS: {
      validate: (val) =>
        val
          ? { success: true as const, value: val.split(',') }
          : { success: false as const, error: 'required' },
    },
  }
})

env.IPS // string[]
```

**Object-level schemas** &mdash; full output type is extracted:

```ts
import { z } from 'zod'

const env = createEnv({
  schema: z.object({
    HOST: z.string(),
    PORT: z.coerce.number(),
  })
})

env.HOST // string
env.PORT // number
```

> **Tip:** Use `as const` on enum `values` arrays to get narrow union types instead of `string`.

## Comparison

| Feature | t3-env | envalid | env-validated |
|---------|--------|---------|----------|
| Zod required | Yes | No | No (optional) |
| TS inference | Yes | No | Yes |
| Framework agnostic | Partial | Yes | Yes |
| Custom env source | No | No | Yes |
| Zero dependencies | No | No | Yes |
| Pluggable validators | No | No | Yes (9 adapters) |
| Object-level schemas | Partial | No | Yes |
| Mix validators per field | No | No | Yes |
| Community adapters | No | No | Yes |

## Supported Adapters

| Library | Auto-detected | Type Inference | Object Schema |
|---------|---------------|----------------|---------------|
| [Zod](https://github.com/colinhacks/zod) | Yes | Full | `z.object()` |
| [Joi](https://github.com/hapijs/joi) | Yes | `string` / `number` / `boolean` / `Date` | Via `joiObject()` |
| [Yup](https://github.com/jquense/yup) | Yes | Full | `yup.object()` |
| [Valibot](https://github.com/fabian-hiller/valibot) | Yes | Full | `v.object()` |
| [TypeBox](https://github.com/sinclairzx81/typebox) | Yes | Full | `Type.Object()` |
| [ArkType](https://github.com/arktypeio/arktype) | Yes | Full | `type({...})` |
| [Superstruct](https://github.com/ianstormtaylor/superstruct) | Yes | Full | `object()` |
| [Runtypes](https://github.com/runtypes/runtypes) | Yes | Full | `Object()` |
| [Effect Schema](https://github.com/Effect-TS/effect) | Yes | Full | `Schema.Struct()` |

## Community Adapters

The validator contract is a simple public interface. Anyone can publish their own adapter as a separate npm package:

```ts
import { registerAdapter } from 'env-validated'

registerAdapter({
  name: 'my-validator',
  detect: (field) => /* return true if this adapter handles the field */,
  validate: (field, raw, key) => {
    // return { success: true, value: parsed } or { success: false, error: 'message' }
  },
})
```

## License

[MIT](./LICENSE)
