export { registerAdapter } from './detect.js';

// This file serves as the sub-path export for env-validated/adapters/arktype.
// ArkType schemas are auto-detected as callable functions with traverse + expression.
// Parsing calls the type as a function and checks for errors in the result.
