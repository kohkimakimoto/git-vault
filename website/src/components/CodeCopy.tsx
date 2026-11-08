import { useEffect } from 'react';
import type { Messages } from '../i18n/utils';

type Props = {
  messages: Pick<Messages['common'], 'copyCode' | 'copiedCode'>;
};

const COPY_ICON = `<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`;
const CHECK_ICON = `<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>`;

function codeText(pre: HTMLPreElement): string {
  const code = pre.querySelector('code');
  return (code?.textContent ?? pre.textContent ?? '').replace(/\n$/, '');
}

function isSingleLine(pre: HTMLPreElement): boolean {
  const text = codeText(pre);
  return text.length > 0 && !text.includes('\n');
}

export default function CodeCopy({ messages }: Props) {
  useEffect(() => {
    const timers = new Map<HTMLButtonElement, number>();
    const wraps: HTMLDivElement[] = [];

    document.querySelectorAll<HTMLPreElement>('main pre').forEach((pre) => {
      if (pre.dataset.copyReady === 'true') return;
      pre.dataset.copyReady = 'true';

      const wrap = document.createElement('div');
      wrap.className = 'code-block';
      if (isSingleLine(pre)) wrap.classList.add('code-block--single');
      pre.parentNode?.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      wraps.push(wrap);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'code-copy';
      button.setAttribute('aria-label', messages.copyCode);
      button.dataset.tooltip = messages.copyCode;
      button.innerHTML = COPY_ICON;

      button.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(codeText(pre));
        } catch {
          return;
        }
        button.innerHTML = CHECK_ICON;
        button.setAttribute('aria-label', messages.copiedCode);
        button.dataset.tooltip = messages.copiedCode;
        button.dataset.copied = 'true';
        const previous = timers.get(button);
        if (previous) window.clearTimeout(previous);
        timers.set(
          button,
          window.setTimeout(() => {
            button.innerHTML = COPY_ICON;
            button.setAttribute('aria-label', messages.copyCode);
            button.dataset.tooltip = messages.copyCode;
            delete button.dataset.copied;
            timers.delete(button);
          }, 1600),
        );
      });

      wrap.appendChild(button);
    });

    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer);
      for (const wrap of wraps) {
        const pre = wrap.querySelector('pre');
        if (pre) {
          delete pre.dataset.copyReady;
          wrap.parentNode?.insertBefore(pre, wrap);
        }
        wrap.remove();
      }
    };
  }, [messages.copyCode, messages.copiedCode]);

  return null;
}
