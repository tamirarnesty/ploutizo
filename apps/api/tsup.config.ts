import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  noExternal: [/@ploutizo\/.*/],
  // Native addon — resolve from node_modules at runtime on the deploy platform.
  external: ['re2'],
});
