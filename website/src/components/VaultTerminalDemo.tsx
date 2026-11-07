import { useEffect, useRef, useState } from 'react';
import {
  CALLOUT_HOLD_MS,
  DEMO_STATIC_CALLOUT,
  DEMO_STATIC_LINES,
  DEMO_STATIC_TREE,
  DEMO_STATIC_VAULT,
  LINE_MS,
  SCENE_FADE_MS,
  SCENE_HOLD_MS,
  TYPE_MS,
  VAULT_ANIM_MS,
  promptLabel,
  vaultDemoScenario,
  type TerminalLine,
  type TreeEnvState,
  type VaultVisualState,
} from '../data/vault-demo-scenario';


type Signal = { cancelled: boolean; paused: boolean };

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function sleep(ms: number, signal: Signal) {
  return new Promise<void>((resolve) => {
    let elapsed = 0;
    let last = performance.now();
    const tick = () => {
      if (signal.cancelled) {
        resolve();
        return;
      }
      const now = performance.now();
      if (!signal.paused) {
        elapsed += now - last;
      }
      last = now;
      if (elapsed >= ms) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function CipherChip({ label = '.env' }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-[color-mix(in_oklab,var(--accent)_45%,var(--border))] bg-[var(--accent-soft)] px-2 py-1 font-mono text-[11px] font-medium text-[var(--accent)] shadow-sm">
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="3" y="7" width="10" height="7" rx="1.5" />
        <path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" />
      </svg>
      <span>{label}</span>
    </div>
  );
}

function FileTree({ env, project }: { env: TreeEnvState; project: string }) {
  const showEnv = env !== 'absent';
  const highlight = env === 'restored';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[var(--border)] px-3 py-2 font-mono text-[10px] tracking-wide text-[var(--fg-muted)] uppercase">
        Working tree
      </div>
      <div className="flex-1 overflow-auto px-2 py-2 font-mono text-[12px] leading-6 sm:text-[13px]">
        <p className="flex items-center gap-1.5 px-1 font-medium text-[var(--fg)]">
          <span className="text-[var(--fg-muted)]">▾</span>
          <span className="truncate">{project}</span>
        </p>
        <ul className="mt-0.5 ml-2.5 space-y-0.5 border-l border-[var(--border)] pl-2">
          <li className="px-1 text-[var(--fg-muted)]">README.md</li>
          {showEnv ? (
            <li
              className={[
                'rounded px-1 transition-all duration-500',
                highlight
                  ? 'bg-[var(--accent-soft)] font-medium text-[var(--accent)] ring-1 ring-[color-mix(in_oklab,var(--accent)_35%,transparent)]'
                  : 'text-[var(--fg)]',
              ].join(' ')}
            >
              <span className="flex items-center gap-1.5">
                <span>.env</span>
                {highlight && <span className="ml-auto text-[10px] tracking-wide uppercase">new</span>}
              </span>
            </li>
          ) : (
            <li className="flex items-center gap-1.5 px-1 text-[var(--fg-muted)] opacity-35">
              <span className="line-through">.env</span>
              <span className="ml-auto text-[10px] tracking-wide uppercase">missing</span>
            </li>
          )}
          <li className="px-1 text-[var(--fg-muted)]">main.go</li>
          <li className="px-1 text-[var(--fg-muted)]">go.mod</li>
          <li className="px-1 text-[var(--fg-muted)]">go.sum</li>
        </ul>
      </div>
    </div>
  );
}

function VaultDiagram({ vault }: { vault: VaultVisualState }) {
  const showLocalChip = vault.local && vault.anim !== 'decrypt';
  const showRemoteChip = vault.remote;
  const encrypting = vault.anim === 'encrypt';
  const decrypting = vault.anim === 'decrypt';
  const pushing = vault.anim === 'push';
  const fetching = vault.anim === 'fetch';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[var(--border)] px-3 py-2 font-mono text-[10px] tracking-wide text-[var(--fg-muted)] uppercase">
        Vault branch
      </div>
      <div className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden px-3 py-4 sm:gap-3 sm:px-4">
        {(pushing || fetching) && (
          <div
            className={[
              'pointer-events-none absolute top-1/2 z-10 -translate-y-1/2',
              pushing ? 'vault-anim-push' : 'vault-anim-fetch',
            ].join(' ')}
          >
            <CipherChip />
          </div>
        )}

        <div
          className={[
            'relative z-[1] flex h-[118px] w-[42%] max-w-[180px] flex-col rounded-xl border-2 border-dashed p-2 transition-colors duration-300',
            vault.local || encrypting
              ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent-soft)_70%,transparent)]'
              : 'border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,transparent)]',
          ].join(' ')}
        >
          <p className="font-mono text-[10px] tracking-wide text-[var(--fg-muted)] uppercase">local</p>
          <p className="font-mono text-[11px] font-medium text-[var(--fg)]">vault</p>
          <div className="mt-auto flex min-h-[36px] items-end justify-center pb-1">
            {(showLocalChip || encrypting) && !decrypting && (
              <div className={encrypting ? 'vault-anim-encrypt' : 'vault-anim-pop'}>
                <CipherChip />
              </div>
            )}
            {decrypting && (
              <div className="vault-anim-decrypt">
                <CipherChip />
              </div>
            )}
            {!showLocalChip && !encrypting && !decrypting && (
              <span className="font-mono text-[10px] text-[var(--fg-muted)] opacity-50">empty</span>
            )}
          </div>
        </div>

        <div className="relative z-[1] flex h-[118px] w-[14%] min-w-[44px] flex-col items-center justify-center">
          <div className="h-px w-full bg-[var(--border)]" />
          <span className="mt-1 font-mono text-[9px] tracking-wide text-[var(--fg-muted)] uppercase">
            {pushing ? 'push →' : fetching ? '← fetch' : 'git'}
          </span>
        </div>

        <div
          className={[
            'relative z-[1] flex h-[118px] w-[42%] max-w-[180px] flex-col rounded-xl border-2 p-2 transition-colors duration-300',
            vault.remote
              ? 'border-[var(--navy)] bg-[color-mix(in_oklab,var(--bg)_30%,var(--bg-elevated))]'
              : 'border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,transparent)]',
          ].join(' ')}
        >
          <p className="font-mono text-[10px] tracking-wide text-[var(--fg-muted)] uppercase">remote</p>
          <p className="font-mono text-[11px] font-medium text-[var(--fg)]">origin/vault</p>
          <div className="mt-auto flex min-h-[36px] items-end justify-center pb-1">
            {showRemoteChip ? (
              <div className={pushing ? 'opacity-35' : 'vault-anim-pop'}>
                <CipherChip />
              </div>
            ) : (
              <span className="font-mono text-[10px] text-[var(--fg-muted)] opacity-50">empty</span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

export default function VaultTerminalDemo() {
  const [lines, setLines] = useState<TerminalLine[]>(DEMO_STATIC_LINES);
  const [typing, setTyping] = useState<{ prompt: string; text: string } | null>(null);
  const [callout, setCallout] = useState<string | null>(DEMO_STATIC_CALLOUT);
  const [host, setHost] = useState('dev@laptop');

  const [sceneCaption, setSceneCaption] = useState<string | null>(null);
  const [uiVisible, setUiVisible] = useState(true);
  const [treeEnv, setTreeEnv] = useState<TreeEnvState>(DEMO_STATIC_TREE);
  const [vault, setVault] = useState<VaultVisualState>(DEMO_STATIC_VAULT);
  const [reduced, setReduced] = useState(false);



  const signalRef = useRef<Signal>({ cancelled: false, paused: false });
  const lineIdRef = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef(promptLabel('dev@laptop'));
  const vaultRef = useRef<VaultVisualState>(DEMO_STATIC_VAULT);

  function nextId(prefix: string) {
    lineIdRef.current += 1;
    return `${prefix}-${lineIdRef.current}`;
  }

  function scrollToBottom() {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  function patchVault(patch: Partial<VaultVisualState>) {
    const next = { ...vaultRef.current, ...patch };
    vaultRef.current = next;
    setVault(next);
  }

  useEffect(() => {
    const signal = signalRef.current;
    signal.cancelled = false;
    signal.paused = false;

    if (prefersReducedMotion()) {
      setReduced(true);
      setLines(DEMO_STATIC_LINES);
      setCallout(DEMO_STATIC_CALLOUT);
      setTreeEnv(DEMO_STATIC_TREE);
      setVault(DEMO_STATIC_VAULT);
      vaultRef.current = DEMO_STATIC_VAULT;
      setTyping(null);
      return;
    }


    setReduced(false);

    async function play() {
      let currentHost = 'dev@laptop';
      let loopIndex = 0;

      while (!signal.cancelled) {
        currentHost = 'dev@laptop';
        setHost(currentHost);
        promptRef.current = promptLabel(currentHost);
        setLines([]);
        setTyping(null);
        setCallout(null);
        setSceneCaption(null);
        setTreeEnv('present');
        patchVault({ local: false, remote: false, anim: null });
        lineIdRef.current = 0;


        if (loopIndex > 0) {
          setUiVisible(true);
          await sleep(SCENE_FADE_MS, signal);
          if (signal.cancelled) return;
        } else {
          setUiVisible(true);
        }
        loopIndex += 1;

        for (const step of vaultDemoScenario) {
          if (signal.cancelled) return;

          switch (step.kind) {
            case 'scene': {
              setCallout(null);
              setUiVisible(false);
              await sleep(SCENE_FADE_MS, signal);
              if (signal.cancelled) return;

              currentHost = step.host;
              setHost(currentHost);
              promptRef.current = promptLabel(currentHost);
              setLines([]);
              setTyping(null);
              // Swap environment while fully hidden
              setTreeEnv('absent');
              patchVault({ local: false, remote: true, anim: null });
              setSceneCaption(step.label);

              setUiVisible(true);
              await sleep(SCENE_FADE_MS + SCENE_HOLD_MS, signal);
              if (signal.cancelled) return;
              setSceneCaption(null);
              break;
            }
            case 'clear': {
              setLines([]);
              setTyping(null);
              break;
            }
            case 'tree': {
              setTreeEnv(step.env);
              break;
            }
            case 'vault': {
              const patch: Partial<VaultVisualState> = {};
              if (step.local !== undefined) patch.local = step.local;
              if (step.remote !== undefined) patch.remote = step.remote;
              if (step.anim !== undefined) patch.anim = step.anim;
              patchVault(patch);
              if (step.anim) {
                await sleep(VAULT_ANIM_MS, signal);
              }
              break;
            }
            case 'callout': {
              setCallout(null);
              await sleep(80, signal);
              if (signal.cancelled) return;
              setCallout(step.text);
              await sleep(CALLOUT_HOLD_MS, signal);
              break;
            }


            case 'prompt': {
              promptRef.current = promptLabel(currentHost, step.cwd);
              setTyping({ prompt: promptRef.current, text: '' });
              scrollToBottom();
              break;
            }
            case 'type': {
              let typed = '';
              const prompt = promptRef.current;
              for (const ch of step.text) {
                if (signal.cancelled) return;
                typed += ch;
                setTyping({ prompt, text: typed });
                await sleep(TYPE_MS, signal);
              }
              setTyping(null);
              setLines((prev) => [
                ...prev,
                { id: nextId('c'), kind: 'command', prompt, text: typed },
              ]);
              await sleep(220, signal);
              break;
            }
            case 'output': {
              for (const line of step.lines) {
                if (signal.cancelled) return;
                setLines((prev) => [...prev, { id: nextId('o'), kind: 'output', text: line }]);
                scrollToBottom();
                await sleep(LINE_MS, signal);
              }
              break;
            }
            case 'pause': {
              await sleep(step.ms ?? 600, signal);
              break;
            }
          }

          scrollToBottom();
        }

        // Loop restart: whole UI fades out before resetting
        setCallout(null);
        setSceneCaption(null);
        setUiVisible(false);
        await sleep(SCENE_FADE_MS, signal);

      }
    }


    void play();

    return () => {
      signal.cancelled = true;
    };
  }, []);

  function setPaused(paused: boolean) {
    if (reduced) return;
    signalRef.current.paused = paused;
  }

  return (
    <div
      className="relative w-full"
      aria-hidden="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className={[
          'relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_18px_50px_-28px_rgb(15_20_28_/_0.55)] transition-opacity duration-500 ease-out',
          uiVisible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        {sceneCaption && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--bg-elevated)] px-6">
            <p className="text-center text-sm font-medium tracking-wide text-[var(--accent)] sm:text-base">
              {sceneCaption}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 truncate font-mono text-[11px] text-[var(--fg-muted)]">
            {host} — app
          </span>
        </div>

        <div className="relative border-b border-[var(--border)]">
          {callout && !sceneCaption && (
            <div className="pointer-events-none absolute top-3 right-3 z-10 w-[min(340px,82%)]">
              <div
                key={callout}
                className="callout-fade-in rounded-xl border-2 border-[var(--accent)] bg-[color-mix(in_oklab,var(--bg-elevated)_94%,transparent)] px-4 py-3 text-left text-sm font-medium leading-snug text-[var(--fg)] shadow-lg backdrop-blur-sm sm:px-5 sm:py-3.5 sm:text-base"
              >
                {callout}
              </div>
            </div>
          )}

          <div
            ref={bodyRef}
            className="h-[220px] overflow-y-auto px-4 py-4 font-mono text-[13px] leading-6 sm:h-[260px] sm:text-[14px]"
          >
            {lines.map((line) => {
              if (line.kind === 'command') {
                return (
                  <p key={line.id} className="whitespace-pre-wrap text-[var(--fg)]">
                    {line.prompt ? <span className="text-[var(--navy)]">{line.prompt} </span> : null}
                    <span>{line.text}</span>
                  </p>
                );
              }
              if (line.kind === 'prompt') {
                return (
                  <p key={line.id} className="text-[var(--fg)]">
                    <span className="text-[var(--navy)]">{line.prompt}</span>
                  </p>
                );
              }
              return (
                <p key={line.id} className="whitespace-pre-wrap text-[var(--fg-muted)]">
                  {line.text}
                </p>
              );
            })}

            {typing && (
              <p className="whitespace-pre-wrap text-[var(--fg)]">
                <span className="text-[var(--navy)]">{typing.prompt} </span>
                <span>{typing.text}</span>
                <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-[var(--accent)] align-middle animate-pulse" />
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 bg-[color-mix(in_oklab,var(--bg)_45%,var(--bg-elevated))] sm:grid-cols-[2fr_3fr]">
          <div className="min-h-[180px] border-[var(--border)] sm:border-r">
            <FileTree env={treeEnv} project="app" />
          </div>
          <div className="min-h-[180px]">
            <VaultDiagram vault={vault} />
          </div>
        </div>
      </div>
    </div>
  );
}
