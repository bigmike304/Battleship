import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Battleship/',
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'node',
  },
});
