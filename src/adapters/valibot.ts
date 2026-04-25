export { registerAdapter } from './detect.js';

// This file serves as the sub-path export for env-validated/adapters/valibot.
// Valibot schemas are auto-detected in detect.ts via the kind === 'schema' property.
// Parsing uses the internal ~run method that all valibot schemas implement.
