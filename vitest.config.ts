import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@murkio/html': local('../html/src/index.ts'),
      '@murkio/react': local('../react/src/index.ts'),
      '@murkio/node': local('../node/src/index.ts'),
    },
  },
  test: { environment: 'node', include: ['test/**/*.test.ts'] },
});
