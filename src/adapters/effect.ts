export { registerAdapter } from './detect.js';

// This file serves as the sub-path export for env-validated/adapters/effect.
// Effect Schema objects are auto-detected via ast + annotations + pipe properties.
// Parsing uses Schema.decodeUnknownSync from effect/Schema or @effect/schema/Schema.
