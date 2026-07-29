import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  noExternal: [/@ploutizo\/.*/],
  external: ['re2js'],
  esbuildOptions(options) {
    options.plugins = [
      ...(options.plugins ?? []),
      {
        name: 'external-re2js',
        setup: (build) => {
          build.onResolve({ filter: /^re2js$/ }, () => ({
            path: 're2js',
            external: true,
          }));
        },
      },
    ];
  },
});
