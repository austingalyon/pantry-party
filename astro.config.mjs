import { defineConfig } from 'astro/config';
import clerk from "@clerk/astro";
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';

export default defineConfig({
  integrations: [clerk(), tailwind(), react()],
  output: 'server',
  adapter: netlify()
});