export { registerAdapter } from './detect.js';

// This file serves as the sub-path export for env-validated/adapters/yup.
// Yup schemas are auto-detected in detect.ts via the spec/tests/transforms properties.
// The Yup adapter pre-coerces string values to number/boolean based on the schema's .type.
