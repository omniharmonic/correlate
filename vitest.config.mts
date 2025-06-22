import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { mergeConfig } from 'vite';
import viteConfig from './vite.renderer.config';


// https://vitejs.dev/config/
export default mergeConfig(viteConfig, defineConfig({
  plugins: [
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    environment: 'happy-dom', // or 'jsdom'
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.ts'],
  },
})); 