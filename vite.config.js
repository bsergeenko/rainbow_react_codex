import { defineConfig } from 'vite';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

export default defineConfig({
  esbuild: { tsconfigRaw: { compilerOptions: { jsx: 'react' } } },
  optimizeDeps: {
    esbuildOptions: {
      tsconfigRaw: { compilerOptions: { jsx: 'react' } },
      // Resolve dependencies inside this workspace without scanning protected parent folders.
      plugins: [{
        name: 'workspace-dependencies',
        setup(build) {
          build.onResolve({ filter: /^(\.|react|scheduler)/ }, args => {
            try { return { path: require.resolve(args.path.startsWith('.') ? path.resolve(args.resolveDir, args.path) : args.path) }; }
            catch { return undefined; }
          });
        },
      }],
    },
  },
});
