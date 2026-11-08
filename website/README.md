# Website

The website is statically generated with Astro and served by Cloudflare Workers Static Assets.

```sh
npm ci
npm run dev
npm test
```

`npm test` checks Astro and TypeScript, builds the site, and validates generated routes, language choices, internal links, fragments, canonical URLs, and reciprocal `hreflang` links. The deployment workflow runs these checks before publishing.

## Languages

English uses the existing URLs (`/`, `/docs/...`). Japanese uses `/ja` and `/ja/docs/...`. URLs omit trailing slashes. Language selection navigates to the same page in another language and preserves its query string and fragment. The URL determines the language; there is no browser-language redirect.

- `src/i18n/config.ts`: supported locale codes, native display names, and the default locale. Astro's routing configuration and the language picker share this definition.
- `src/i18n/en.ts` and `ja.ts`: UI translations, including home-page copy and demo annotations. All dictionaries must provide the same keys.
- `src/content/docs/{locale}/{section}/{slug}.md`: documentation translations. Keep the same section and slug across languages; the collection ID includes the locale, while the public English URL does not.
- `src/pages/search/[locale].json.ts`: build-time search indexes (`/search/en.json`, `/search/ja.json`). The docs search UI loads only the current locale's index and searches in the browser.
- `src/pages/[lang]/`: statically generated routes for non-default languages. Page rendering is shared with the English routes.

To add a language:

1. Add its code and display name to `config.ts`.
2. Create a UI dictionary satisfying `Messages` and register it in `utils.ts`.
3. Add translated Markdown under `src/content/docs/{locale}/`, retaining `section` and `order`.
4. Write documentation links using that language's public URL prefix. Preserve the English heading IDs with explicit HTML headings, such as `<h2 id="requirements">要件</h2>`, so links and language switching retain their fragments.
5. Run `npm test` and check the language picker and layout in a browser.

An article's language picker and `hreflang` links include only existing translations. Missing translations are shown as disabled choices. Shared assets and external links have no locale prefix. CLI commands, sample output, paths, and branch names stay unchanged in translated documentation and demos.

## Production routing

`wrangler.jsonc` uses `html_handling: "drop-trailing-slash"` and `not_found_handling: "404-page"`. Each additional language generates its own `/{locale}/404.html`, allowing Cloudflare to serve the nearest localized error page with HTTP 404.

Run `npm run preview:cloudflare` to build the site and start Wrangler's local server with the production asset routing configuration. Use it to verify trailing-slash redirects and localized 404 responses. Astro's development server alone does not verify Cloudflare's localized 404 handling.
