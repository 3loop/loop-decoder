import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

import cloudflare from '@astrojs/cloudflare'

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'Loop Decoder',
      customCss: [
        // Relative path to your custom CSS file
        './src/styles/custom.css',
      ],
      social: {
        github: 'https://github.com/3loop/loop-decoder',
        twitter: 'https://x.com/3loop_io',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            {
              label: 'Introduction',
              link: '/getting-started',
            },
          ],
        },
        {
          label: 'Guides',
          autogenerate: {
            directory: 'guides',
          },
        },
        {
          label: 'Reference',
          autogenerate: {
            directory: 'reference',
          },
        },
        {
          label: 'Recipes',
          autogenerate: {
            directory: 'recipes',
          },
        },
        {
          label: 'Contribution',
          link: '/contribution',
        },
      ],
    }),
  ],
  output: 'server',
  adapter: cloudflare(),
})
