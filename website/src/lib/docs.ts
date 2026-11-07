import { getCollection, type CollectionEntry } from 'astro:content';

export type DocEntry = CollectionEntry<'docs'>;

export const DOC_SECTIONS = [
  { id: 'guide' as const, title: 'Guide' },
  { id: 'reference' as const, title: 'Command reference' },
];

export type DocSectionId = (typeof DOC_SECTIONS)[number]['id'];

export async function getOrderedDocs(): Promise<DocEntry[]> {
  const docs = await getCollection('docs');
  const sectionRank = Object.fromEntries(DOC_SECTIONS.map((s, i) => [s.id, i]));
  return docs.sort((a, b) => {
    const sectionDiff = sectionRank[a.data.section] - sectionRank[b.data.section];
    if (sectionDiff !== 0) return sectionDiff;
    return a.data.order - b.data.order;
  });
}

export async function getDocsGroupedBySection(): Promise<
  { id: DocSectionId; title: string; docs: DocEntry[] }[]
> {
  const docs = await getOrderedDocs();
  return DOC_SECTIONS.map((section) => ({
    ...section,
    docs: docs.filter((doc) => doc.data.section === section.id),
  }));
}

export function docHref(doc: DocEntry): string {
  return `/docs/${doc.id}`;

}
