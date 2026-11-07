import { getCollection, type CollectionEntry } from 'astro:content';
import { isLocale, type Locale } from '../i18n/config';
import { getMessages, localizedPath } from '../i18n/utils';

export type DocEntry = CollectionEntry<'docs'>;
export const DOC_SECTIONS = ['guide', 'reference'] as const;
export type DocSectionId = (typeof DOC_SECTIONS)[number];

export function docIdentity(doc: DocEntry): { locale: Locale; slug: string } {
  const [locale, ...parts] = doc.id.split('/');
  if (!isLocale(locale) || parts.length < 2) {
    throw new Error(`Invalid localized documentation ID: ${doc.id}`);
  }
  return { locale, slug: parts.join('/') };
}

export async function getOrderedDocs(locale: Locale): Promise<DocEntry[]> {
  const docs = await getCollection('docs', (doc) => docIdentity(doc).locale === locale);
  return docs.sort((a, b) => {
    const sectionDiff = DOC_SECTIONS.indexOf(a.data.section) - DOC_SECTIONS.indexOf(b.data.section);
    return sectionDiff || a.data.order - b.data.order;
  });
}

export async function getDocsGroupedBySection(locale: Locale) {
  const docs = await getOrderedDocs(locale);
  const messages = getMessages(locale);
  return DOC_SECTIONS.map((id) => ({
    id,
    title: messages.docs[id],
    docs: docs.filter((doc) => doc.data.section === id),
  }));
}

export function docHref(doc: DocEntry): string {
  const { locale, slug } = docIdentity(doc);
  return localizedPath(locale, `/docs/${slug}`);
}

export async function getDocAlternates(doc: DocEntry) {
  const { slug } = docIdentity(doc);
  const translations = await getCollection('docs', (entry) => docIdentity(entry).slug === slug);
  return translations.map((entry) => ({ locale: docIdentity(entry).locale, href: docHref(entry) }));
}
