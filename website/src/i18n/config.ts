export const languages = {
  en: 'English',
  ja: '日本語',
} as const;

export type Locale = keyof typeof languages;
export type LanguageAlternate = { locale: Locale; href: string };
export const defaultLocale: Locale = 'en';
export const locales = Object.keys(languages) as Locale[];
export const translatedLocales = locales.filter((locale) => locale !== defaultLocale);

export function isLocale(value: string): value is Locale {
  return Object.hasOwn(languages, value);
}
