import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['index.ts'],  // or 'src/index.js' if you're using JavaScript
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  treeshake: true,
  outDir: 'dist',
})
