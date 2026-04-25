export { registerAdapter } from './detect.js';

// This file serves as the sub-path export for env-validated/adapters/typebox.
// TypeBox schemas are auto-detected via Symbol.for('TypeBox.Kind').
// Parsing uses Value.Convert + Value.Check + Value.Decode from @sinclair/typebox/value.
