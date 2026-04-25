export { registerAdapter } from './detect.js';

// This file serves as the sub-path export for env-validated/adapters/superstruct.
// Superstruct schemas are auto-detected via refiner + coercer + validator properties.
// Parsing uses the struct's coercer, validator, and refiner methods directly.
