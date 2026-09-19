// @ts-check
import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import expressiveCode from 'astro-expressive-code'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://eoria.adamtrip.pt',
  trailingSlash: 'always',
  integrations: [
    // Options live in ec.config.mjs, where the <Code> component can read them too.
    expressiveCode(),
    mdx(),
    sitemap(),
  ],
})
