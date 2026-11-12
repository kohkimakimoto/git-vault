import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { Locale } from '../i18n/config';
import type { Messages } from '../i18n/utils';
import {
  searchDocuments,
  searchIndexUrl,
  type SearchIndex,
  type SearchResult,
} from '../lib/search';

type Props = {
  locale: Locale;
  messages: Messages['docs'];
};

const indexes = new Map<Locale, Promise<SearchIndex>>();

function loadIndex(locale: Locale): Promise<SearchIndex> {
  const cached = indexes.get(locale);
  if (cached) return cached;

  const request = fetch(searchIndexUrl(locale))
    .then(async (response) => {
      if (!response.ok) throw new Error(`Failed to load search index (${response.status})`);
      const index = (await response.json()) as SearchIndex;
      if (index.locale !== locale || !Array.isArray(index.documents)) {
        throw new Error('Invalid search index');
      }
      return index;
    })
    .catch((error) => {
      indexes.delete(locale);
      throw error;
    });

  indexes.set(locale, request);
  return request;
}

export default function DocsSearch({ locale, messages }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => {
    function openSearch() {
      setOpen(true);
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
      }
    }

    const triggers = document.querySelectorAll('[data-docs-search-open]');
    triggers.forEach((trigger) => trigger.addEventListener('click', openSearch));
    window.addEventListener('keydown', onKeyDown);
    return () => {
      triggers.forEach((trigger) => trigger.removeEventListener('click', openSearch));
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      inputRef.current?.focus();
      inputRef.current?.select();
      setStatus((current) => (current === 'ready' ? current : 'loading'));
      loadIndex(locale)
        .then(() => setStatus('ready'))
        .catch(() => setStatus('error'));
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, locale]);

  useEffect(() => {
    if (!open || status !== 'ready') return;
    let cancelled = false;
    loadIndex(locale).then((index) => {
      if (cancelled) return;
      const next = searchDocuments(index.documents, query);
      setResults(next);
      setActiveIndex(0);
    });
    return () => {
      cancelled = true;
    };
  }, [open, locale, query, status]);

  function close() {
    setOpen(false);
    setQuery('');
    setResults([]);
    setActiveIndex(0);
  }

  function goTo(href: string) {
    close();
    window.location.assign(href);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Ignore keys while an IME composition is active (e.g. Japanese 変換確定 Enter).
    if (event.nativeEvent.isComposing || composingRef.current) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (results.length === 0 ? 0 : (index + 1) % results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) =>
        results.length === 0 ? 0 : (index - 1 + results.length) % results.length,
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = results[activeIndex];
      if (target) goTo(target.href);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="docs-search-dialog fixed inset-0 z-[60] m-0 h-auto max-h-none w-auto max-w-none border-0 bg-transparent p-4 text-[var(--fg)] sm:p-0"
      aria-label={messages.search}
      onClose={close}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
    >
      <div className="flex max-h-[min(28rem,calc(100dvh-2rem))] w-[min(36rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] shadow-xl sm:mt-[15vh]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[var(--fg-muted)]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={() => {
              // Some browsers fire the confirming Enter keydown after compositionend.
              requestAnimationFrame(() => {
                composingRef.current = false;
              });
            }}
            onKeyDown={onInputKeyDown}
            placeholder={messages.searchPlaceholder}
            className="h-12 w-full bg-transparent text-base outline-none placeholder:text-[var(--fg-muted)]"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-activedescendant={results[activeIndex] ? `${listId}-${activeIndex}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-[var(--fg-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--fg)]"
            aria-label={messages.searchClose}
            onClick={close}
          >
            Esc
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2" role="listbox" id={listId}>
          {status === 'loading' && (
            <p className="px-3 py-6 text-sm text-[var(--fg-muted)]">{messages.searchLoading}</p>
          )}
          {status === 'error' && (
            <p className="px-3 py-6 text-sm text-[var(--fg-muted)]">{messages.searchError}</p>
          )}
          {status === 'ready' && query.trim() && results.length === 0 && (
            <p className="px-3 py-6 text-sm text-[var(--fg-muted)]">{messages.searchNoResults}</p>
          )}
          {status === 'ready' &&
            results.map((result, index) => (
              <a
                key={result.href}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                href={result.href}
                className={`block rounded-md px-3 py-2 ${
                  index === activeIndex ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--accent-soft)]'
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={(event) => {
                  event.preventDefault();
                  goTo(result.href);
                }}
              >
                <span className="block text-sm font-medium text-[var(--fg)]">{result.title}</span>
                <span className="mt-0.5 block text-xs text-[var(--fg-muted)]">
                  {messages[result.section]} · {result.description}
                </span>
              </a>
            ))}
        </div>
      </div>
    </dialog>
  );
}
