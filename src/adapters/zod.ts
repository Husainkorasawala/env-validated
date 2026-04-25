export { registerAdapter } from './detect.js';

// This file serves as the sub-path export for env-validated/adapters/zod.
// Zod schemas are auto-detected in detect.ts via the _zod / _def property.
// Importing this file is optional — it exists for explicit adapter registration
// and re-export convenience.
