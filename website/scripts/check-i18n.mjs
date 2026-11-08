import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defaultLocale, locales } from '../src/i18n/config.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = `${root}dist`;
const pages = new Map();

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
}

function publicPath(file) {
  return file.slice(dist.length).replace(/\/index\.html$/, '/').replace(/\.html$/, '');
}

function localized(locale, path = '') {
  return `${locale === defaultLocale ? '' : `/${locale}`}${path}` || '/';
}

function languageChoices(html) {
  return [...html.matchAll(/<ul\b[^>]*\bdata-language-menu\b[^>]*>[\s\S]*?<\/ul>/g)].flatMap((menu) =>
    [...menu[0].matchAll(/<li\b[^>]*\brole="option"[^>]*>[\s\S]*?<\/li>/g)].map((match) => {
      const item = match[0];
      const link = item.match(/<a\b[^>]*>/);
      const span = item.match(/<span\b[^>]*>/);
      const target = attributes((link ?? span)?.[0] ?? '');
      return {
        lang: target.lang,
        href: target.href,
        selected: /\saria-selected(?:="true")?(?=[\s>])/.test(item) && !/\saria-selected="false"/.test(item),
        disabled: !link,
      };
    }),
  );
}

for (const file of walk(dist).filter((path) => path.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  pages.set(publicPath(file), {
    html,
    ids: new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])),
    links: [...html.matchAll(/<link\b[^>]*>/g)].map((match) => attributes(match[0])),
    options: languageChoices(html),
  });
}

for (const locale of locales) {
  const source = `${root}src/content/docs/${locale}`;
  const docs = walk(source).filter((path) => path.endsWith('.md'));
  assert(docs.length > 0, `No documentation for ${locale}`);
  for (const file of docs) {
    const slug = file.slice(source.length, -3);
    assert(pages.has(localized(locale, `/docs${slug}`)), `Missing generated page: ${locale}${slug}`);
  }
  assert(pages.has(localized(locale)), `Missing home page for ${locale}`);
  assert(pages.has(localized(locale, '/404')), `Missing localized 404 for ${locale}`);
  const redirect = pages.get(localized(locale, '/docs'))?.html;
  assert(redirect?.includes(`url=${localized(locale, '/docs/guide/introduction')}`), `Wrong docs redirect for ${locale}`);

  const searchIndexPath = `${dist}/search/${locale}.json`;
  assert(existsSync(searchIndexPath), `Missing search index: ${locale}`);
  const searchIndex = JSON.parse(readFileSync(searchIndexPath, 'utf8'));
  assert.equal(searchIndex.locale, locale, `Wrong search index locale: ${locale}`);
  assert.equal(searchIndex.documents?.length, docs.length, `Wrong search index size: ${locale}`);
  for (const document of searchIndex.documents) {
    assert(pages.has(document.href), `Search result points to missing page: ${locale} → ${document.href}`);
    assert(document.title && document.description && document.body, `Incomplete search document: ${document.href}`);
    assert(['guide', 'reference'].includes(document.section), `Bad search section: ${document.href}`);
  }
}

assert(!pages.has(`/${defaultLocale}`), 'Default language must not have a prefix');
assert(existsSync(`${dist}/og.png`), 'Missing Open Graph image: /og.png');

const home = pages.get('/');
assert(home, 'Missing default home page');
assert(home.html.includes('property="og:image"'), 'Missing og:image on home page');
assert(home.html.includes('name="twitter:card"'), 'Missing twitter:card on home page');
assert(home.html.includes('/og.png'), 'Home page og:image must point to /og.png');

for (const [path, page] of pages) {
  if (path === '/docs' || locales.some((locale) => path === `/${locale}/docs`)) continue;
  const locale = locales.find((code) => path.startsWith(`/${code}/` ) || path === `/${code}`) ?? defaultLocale;
  assert(page.html.includes(`<html lang="${locale}">`), `Wrong HTML language: ${path}`);
  assert.equal(page.options.length, locales.length, `Wrong language choices: ${path}`);
  assert.equal(page.options.filter((option) => option.selected).length, 1, `Wrong selected language: ${path}`);
  assert.equal(page.options.find((option) => option.selected)?.lang, locale, `Wrong selected locale: ${path}`);

  const noindex = page.html.includes('content="noindex"');
  const canonical = page.links.find((link) => link.rel === 'canonical');
  if (noindex) {
    assert(!canonical, `404 must not be canonical: ${path}`);
  } else {
    assert(canonical, `Missing canonical: ${path}`);
    assert.equal(new URL(canonical.href).pathname, path, `Wrong canonical: ${path}`);
    for (const option of page.options.filter((option) => !option.disabled)) {
      assert(pages.has(option.href), `Language switch points to missing page: ${path} → ${option.href}`);
      const alternate = page.links.find((link) => link.hreflang === option.lang);
      assert(alternate, `Missing hreflang ${option.lang}: ${path}`);
      assert.equal(new URL(alternate.href).pathname, option.href, `Wrong alternate: ${path}`);
      const reverse = pages.get(option.href).links.find((link) => link.hreflang === locale);
      assert.equal(reverse && new URL(reverse.href).pathname, path, `Non-reciprocal alternate: ${path}`);
    }
    const fallback = page.links.find((link) => link.hreflang === 'x-default');
    assert.equal(fallback && new URL(fallback.href).pathname, page.options.find((option) => option.lang === defaultLocale)?.href, `Wrong x-default: ${path}`);
  }

  for (const match of page.html.matchAll(/<a\b[^>]*>/g)) {
    const { href } = attributes(match[0]);
    if (!href || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue;
    const languageSwitch = /\sdata-language-option(?:[\s=>])/.test(match[0]);
    const target = new URL(href.replaceAll('&amp;', '&'), `https://example.test${path}`);
    const destination = pages.get(target.pathname);
    if (!destination) {
      assert(existsSync(`${dist}${target.pathname}`), `Broken link: ${path} → ${href}`);
      continue;
    }
    if (target.hash) {
      assert(destination.ids.has(decodeURIComponent(target.hash.slice(1))), `Broken anchor: ${path} → ${href}`);
    }
    if (!languageSwitch && target.pathname.includes('/docs/')) {
      assert(target.pathname.startsWith(localized(locale, '/docs/')), `Link changes language: ${path} → ${href}`);
    }
  }
}

// Stable IDs let language switching preserve fragments on documentation pages.
for (const [path, page] of pages) {
  if (!path.startsWith('/docs/')) continue;
  const headings = [...page.html.matchAll(/<h[2-6]\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
  for (const locale of locales.filter((code) => code !== defaultLocale)) {
    const translation = pages.get(localized(locale, path));
    if (translation) for (const id of headings) assert(translation.ids.has(id), `Missing shared anchor ${id}: ${locale}${path}`);
  }
}

console.log(`Verified ${pages.size} generated pages: routes, language choices, links, anchors, canonical and hreflang.`);
