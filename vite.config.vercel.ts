import { nitro } from 'nitro/vite';
import vinext from 'vinext';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), vinext(), nitro()],
});
