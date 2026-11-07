import { getRelativeLocaleUrl } from 'astro:i18n';
import { defaultLocale, isLocale, type Locale } from './config';
import { en } from './en';
import { ja } from './ja';

export type Messages = { [Group in keyof typeof en]: { [Key in keyof (typeof en)[Group]]: string } };
const dictionaries: Record<Locale, Messages> = { en, ja };

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}

export function getLocaleFromUrl(url: URL): Locale {
  const first = url.pathname.split('/')[1];
  return isLocale(first) ? first : defaultLocale;
}

/** Public paths omit build-time .html extensions and trailing slashes. */
export function publicPath(pathname: string): string {
  return pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/+$/, '') || '/';
}

export function unlocalizedPath(pathname: string): string {
  const path = publicPath(pathname);
  const first = path.split('/')[1];
  return isLocale(first) ? path.slice(first.length + 1) || '/' : path;
}

export function localizedPath(locale: Locale, pathname = '/'): string {
  return getRelativeLocaleUrl(locale, unlocalizedPath(pathname).replace(/^\//, ''));
}
