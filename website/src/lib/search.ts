import type { Locale } from '../i18n/config';

export type SearchDocument = {
  title: string;
  description: string;
  href: string;
  section: 'guide' | 'reference';
  body: string;
};

export type SearchIndex = {
  locale: Locale;
  documents: SearchDocument[];
};

export type SearchResult = SearchDocument & { score: number };

/** Strip Markdown/HTML markup while keeping searchable text (including code). */
export function markdownToSearchText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/^```\w*\n?|\n?```$/g, ' '))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/[*_~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSearchText(text: string): string {
  return text.normalize('NFKC').toLowerCase();
}

export function searchTerms(query: string): string[] {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

export function searchDocuments(documents: SearchDocument[], query: string): SearchResult[] {
  const terms = searchTerms(query);
  if (terms.length === 0) return [];

  const results: SearchResult[] = [];
  for (const doc of documents) {
    const title = normalizeSearchText(doc.title);
    const description = normalizeSearchText(doc.description);
    const body = normalizeSearchText(doc.body);
    let score = 0;
    let matched = true;

    for (const term of terms) {
      const inTitle = title.includes(term);
      const inDescription = description.includes(term);
      const inBody = body.includes(term);
      if (!inTitle && !inDescription && !inBody) {
        matched = false;
        break;
      }
      if (inTitle) score += 10;
      if (inDescription) score += 5;
      if (inBody) score += 1;
    }

    if (matched) results.push({ ...doc, score });
  }

  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export function searchIndexUrl(locale: Locale): string {
  return `/search/${locale}.json`;
}
