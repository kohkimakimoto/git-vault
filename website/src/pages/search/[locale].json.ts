import type { APIRoute } from 'astro';
import { isLocale, locales, type Locale } from '../../i18n/config';
import { docHref, getOrderedDocs } from '../../lib/docs';
import { markdownToSearchText, type SearchDocument, type SearchIndex } from '../../lib/search';

export function getStaticPaths() {
  return locales.map((locale) => ({ params: { locale } }));
}

export const GET: APIRoute = async ({ params }) => {
  const localeParam = params.locale;
  if (!localeParam || !isLocale(localeParam)) {
    return new Response('Not found', { status: 404 });
  }

  const locale: Locale = localeParam;
  const docs = await getOrderedDocs(locale);
  const documents: SearchDocument[] = docs.map((doc) => ({
    title: doc.data.title,
    description: doc.data.description,
    href: docHref(doc),
    section: doc.data.section,
    body: markdownToSearchText(doc.body ?? ''),
  }));

  const index: SearchIndex = { locale, documents };
  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
};
