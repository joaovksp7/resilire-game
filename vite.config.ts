import { defineConfig } from 'vite';

export default defineConfig({
  // Caminhos relativos: o build precisa abrir em subpasta e dentro de iframe.
  base: './',
  build: {
    target: 'es2022',
  },
});
