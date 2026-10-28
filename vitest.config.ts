import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { projects: [
    { test: { name: 'unit', include: ['src/test/**/*.test.ts', 'tests/*.unit.test.ts'] } },
    { test: { name: 'contracts', include: ['tests/Contracts.test.ts'] } },
    { test: { name: 'emulator', include: ['tests/Rules.emulator.test.ts'], fileParallelism: false, maxWorkers: 1, testTimeout: 20000, hookTimeout: 30000 } },
  ] },
});
