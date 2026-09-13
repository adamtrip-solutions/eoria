import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts', jest: 'src/jest.ts', tokens: 'src/tokens.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-native', 'react-native-unistyles'],
})
