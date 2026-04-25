import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.check.json',
    },
  },
});
