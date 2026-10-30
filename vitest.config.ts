import { defineConfig } from 'vitest/config';

// Pure-logic tests (mechanics + game servers). End-to-end checks against the real
// Worker/Durable Object live in scripts/smoke.mjs.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
    },
});
