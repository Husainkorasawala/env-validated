export { registerAdapter } from './detect.js';

// This file serves as the sub-path export for env-validated/adapters/runtypes.
// Runtypes schemas are auto-detected via check + guard + tag properties.
// Parsing uses the runtype's .validate() method which returns { success, value/message }.
