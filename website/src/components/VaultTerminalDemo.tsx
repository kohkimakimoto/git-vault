import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
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
  type DemoStep,
  type TerminalLine,
  type TreeEnvState,
  type VaultVisualState,
} from '../data/vault-demo-scenario';


type Signal = { cancelled: boolean; paused: boolean };
type ProgressReporter = ((progress: number) => void) | null;

const COMMAND_HOLD_MS = 220;
const CALLOUT_GAP_MS = 80;

function stepDuration(step: DemoStep): number {
  switch (step.kind) {
    case 'scene': return SCENE_FADE_MS * 2 + SCENE_HOLD_MS;
    case 'type': return [...step.text].length * TYPE_MS + COMMAND_HOLD_MS;
    case 'output': return step.lines.length * LINE_MS;
    case 'callout': return CALLOUT_GAP_MS + CALLOUT_HOLD_MS;
    case 'vault': return step.anim ? VAULT_ANIM_MS : 0;
    case 'pause': return step.ms ?? 600;
    default: return 0;
  }
}

function DemoProgress({ reporter }: { reporter: RefObject<ProgressReporter> }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    reporter.current = setProgress;
    return () => { reporter.current = null; };
  }, [reporter]);

  return <progress className="demo-progress mt-3" aria-label="Demo cycle progress" max={100} value={progress} />;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function sleep(ms: number, signal: Signal, onProgress?: (elapsed: number) => void) {
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
        onProgress?.(Math.min(elapsed, ms));
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

function CipherChip({ label = '.env', encrypted = true }: { label?: string; encrypted?: boolean }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-[color-mix(in_oklab,var(--accent)_45%,var(--border))] bg-[var(--accent-soft)] px-2 py-1 font-mono text-[11px] font-medium text-[var(--accent)] shadow-sm">
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        {encrypted ? (
          <>
            <rect x="3" y="7" width="10" height="7" rx="1.5" />
            <path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" />
          </>
        ) : (
          <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6L9 2zm0 0v4h4M5 9h6M5 11h6" />
        )}
      </svg>
      <span>{label}</span>
    </div>
  );
}

function FileTree({ env, project, envRef }: { env: TreeEnvState; project: string; envRef: RefObject<HTMLSpanElement | null> }) {
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
                <span ref={envRef}>.env</span>
                {highlight && <span className="ml-auto text-[10px] tracking-wide uppercase">new</span>}
              </span>
            </li>
          ) : (
            <li className="flex items-center gap-1.5 px-1 text-[var(--fg-muted)] opacity-35">
              <span ref={envRef} className="line-through">.env</span>
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

function VaultTransfer({
  surfaceRef,
  fromRef,
  toRef,
  encrypted,
}: {
  surfaceRef: RefObject<HTMLDivElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  encrypted: boolean;
}) {
  const [path, setPath] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    const from = fromRef.current;
    const to = toRef.current;
    if (!surface || !from || !to) return;

    const measure = () => {
      const base = surface.getBoundingClientRect();
      const start = from.getBoundingClientRect();
      const end = to.getBoundingClientRect();
      const x = start.left + start.width / 2;
      const y = start.top + start.height / 2;
      setPath({
        x: x - base.left,
        y: y - base.top,
        dx: end.left + end.width / 2 - x,
        dy: end.top + end.height / 2 - y,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(surface);
    observer.observe(from);
    observer.observe(to);
    return () => observer.disconnect();
  }, [surfaceRef, fromRef, toRef]);

  if (!path) return null;

  return (
    <div
      className="pointer-events-none absolute z-20 w-max -translate-x-1/2 -translate-y-1/2"
      style={{
        left: path.x,
        top: path.y,
        '--vault-transfer-x': `${path.dx}px`,
        '--vault-transfer-y': `${path.dy}px`,
      } as CSSProperties}
    >
      <div className="vault-anim-transfer">
        <CipherChip encrypted={encrypted} />
      </div>
    </div>
  );
}

function VaultDiagram({ vault, localRef, remoteRef }: {
  vault: VaultVisualState;
  localRef: RefObject<HTMLDivElement | null>;
  remoteRef: RefObject<HTMLDivElement | null>;
}) {
  const showLocalChip = vault.local || vault.fetched;
  const showRemoteChip = vault.remote;
  const encrypting = vault.anim === 'encrypt';
  const pushing = vault.anim === 'push';
  const fetching = vault.anim === 'fetch';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[var(--border)] px-3 py-2 font-mono text-[10px] tracking-wide text-[var(--fg-muted)] uppercase">
        Vault branch
      </div>
      <div className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden px-3 py-4 sm:gap-3 sm:px-4">
        <div
          className={[
            'relative z-[1] flex h-[118px] w-[42%] max-w-[180px] flex-col rounded-xl border-2 border-dashed p-2 transition-colors duration-300',
            showLocalChip || encrypting || fetching
              ? 'border-[var(--accent-decoration)] bg-[color-mix(in_oklab,var(--accent-soft)_70%,transparent)]'
              : 'border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,transparent)]',
          ].join(' ')}
        >
          <p className="font-mono text-[10px] tracking-wide text-[var(--fg-muted)] uppercase">local</p>
          <p className="font-mono text-[11px] font-medium text-[var(--fg)]">
            {vault.local || (!vault.fetched && !fetching) ? 'vault' : 'origin/vault'}
          </p>
          <div className="mt-auto flex min-h-[36px] items-end justify-center pb-1">
            <div ref={localRef} className="flex h-7 w-16 items-center justify-center">
              {showLocalChip && <CipherChip />}
              {!showLocalChip && !encrypting && !fetching && (
                <span className="font-mono text-[10px] text-[var(--fg-muted)] opacity-50">empty</span>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-[1] flex h-[118px] w-[14%] min-w-[44px] flex-col items-center justify-end pb-2.5">
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
            <div ref={remoteRef} className="flex h-7 w-16 items-center justify-center">
              {showRemoteChip && <CipherChip />}
              {!showRemoteChip && !pushing && (
                <span className="font-mono text-[10px] text-[var(--fg-muted)] opacity-50">empty</span>
              )}
            </div>
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
  const [host, setHost] = useState('dev@ci');

  const [sceneCaption, setSceneCaption] = useState<string | null>(null);
  const [uiVisible, setUiVisible] = useState(true);
  const [treeEnv, setTreeEnv] = useState<TreeEnvState>(DEMO_STATIC_TREE);
  const [vault, setVault] = useState<VaultVisualState>(DEMO_STATIC_VAULT);
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);



  const signalRef = useRef<Signal>({ cancelled: false, paused: false });
  const progressReporterRef = useRef<ProgressReporter>(null);
  const lineIdRef = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const transferSurfaceRef = useRef<HTMLDivElement>(null);
  const treeEnvRef = useRef<HTMLSpanElement>(null);
  const localChipRef = useRef<HTMLDivElement>(null);
  const remoteChipRef = useRef<HTMLDivElement>(null);
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
      const scenarioDuration = vaultDemoScenario.reduce((total, step) => total + stepDuration(step), 0);

      while (!signal.cancelled) {
        const cycleDuration = scenarioDuration + SCENE_FADE_MS + (loopIndex > 0 ? SCENE_FADE_MS : 0);
        let completedMs = 0;
        progressReporterRef.current?.(0);

        async function wait(ms: number) {
          await sleep(ms, signal, (elapsed) => {
            progressReporterRef.current?.(Math.min(100, (completedMs + elapsed) / cycleDuration * 100));
          });
          completedMs += ms;
        }

        currentHost = 'dev@laptop';
        setHost(currentHost);
        promptRef.current = promptLabel(currentHost);
        setLines([]);
        setTyping(null);
        setCallout(null);
        setSceneCaption(null);
        setTreeEnv('present');
        patchVault({ local: false, remote: false, fetched: false, anim: null });
        lineIdRef.current = 0;


        if (loopIndex > 0) {
          setUiVisible(true);
          await wait(SCENE_FADE_MS);
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
              await wait(SCENE_FADE_MS);
              if (signal.cancelled) return;

              currentHost = step.host;
              setHost(currentHost);
              promptRef.current = promptLabel(currentHost);
              setLines([]);
              setTyping(null);
              // Swap environment while fully hidden
              setTreeEnv('absent');
              patchVault({ local: false, remote: true, fetched: false, anim: null });
              setSceneCaption(step.label);

              setUiVisible(true);
              await wait(SCENE_FADE_MS + SCENE_HOLD_MS);
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
              if (step.fetched !== undefined) patch.fetched = step.fetched;
              if (step.anim !== undefined) patch.anim = step.anim;
              patchVault(patch);
              if (step.anim) {
                await wait(VAULT_ANIM_MS);
              }
              break;
            }
            case 'callout': {
              setCallout(null);
              await wait(CALLOUT_GAP_MS);
              if (signal.cancelled) return;
              setCallout(step.text);
              await wait(CALLOUT_HOLD_MS);
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
                await wait(TYPE_MS);
              }
              setTyping(null);
              setLines((prev) => [
                ...prev,
                { id: nextId('c'), kind: 'command', prompt, text: typed },
              ]);
              await wait(COMMAND_HOLD_MS);
              break;
            }
            case 'output': {
              for (const line of step.lines) {
                if (signal.cancelled) return;
                setLines((prev) => [...prev, { id: nextId('o'), kind: 'output', text: line }]);
                scrollToBottom();
                await wait(LINE_MS);
              }
              break;
            }
            case 'pause': {
              await wait(step.ms ?? 600);
              break;
            }
          }

          scrollToBottom();
        }

        // Loop restart: whole UI fades out before resetting
        setCallout(null);
        setSceneCaption(null);
        setUiVisible(false);
        await wait(SCENE_FADE_MS);

      }
    }


    void play();

    return () => {
      signal.cancelled = true;
    };
  }, []);

  function togglePaused() {
    if (reduced) return;
    const next = !signalRef.current.paused;
    signalRef.current.paused = next;
    setPaused(next);
  }

  return (
    <section
      className="relative w-full"
      aria-label="git-vault workflow demo"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--fg-muted)]">Workflow demo</p>
        {!reduced && (
          <button
            type="button"
            onClick={togglePaused}
            aria-controls="vault-demo-visual"
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--fg)] transition hover:border-[var(--navy)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              {paused ? <path d="M4 2l10 6-10 6z" /> : <path d="M3 2h4v12H3zM10 2h4v12h-4z" />}
            </svg>
            {paused ? 'Resume demo' : 'Pause demo'}
          </button>
        )}
      </div>
      <div
        id="vault-demo-visual"
        aria-hidden="true"
        className={[
          'relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_18px_50px_-28px_rgb(15_20_28_/_0.55)] transition-opacity duration-500 ease-out',
          uiVisible ? 'opacity-100' : 'opacity-0',
          paused ? 'demo-paused' : '',
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
          <div className="flex min-h-[88px] items-center border-b border-[var(--border)] bg-[var(--accent-soft)] px-4 py-3 sm:min-h-[72px]">
            {callout && !sceneCaption && (
              <p
                key={callout}
                className="callout-fade-in border-l-2 border-[var(--accent-decoration)] pl-3 text-sm font-medium leading-snug text-[var(--fg)] sm:text-base"
              >
                {callout}
              </p>
            )}
          </div>

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

        <div ref={transferSurfaceRef} className="relative grid grid-cols-1 bg-[color-mix(in_oklab,var(--bg)_45%,var(--bg-elevated))] sm:grid-cols-[2fr_3fr]">
          <div className="min-h-[180px] border-[var(--border)] sm:border-r">
            <FileTree env={treeEnv} project="app" envRef={treeEnvRef} />
          </div>
          <div className="min-h-[180px]">
            <VaultDiagram vault={vault} localRef={localChipRef} remoteRef={remoteChipRef} />
          </div>
          {vault.anim && (
            <VaultTransfer
              key={vault.anim}
              surfaceRef={transferSurfaceRef}
              fromRef={vault.anim === 'encrypt' ? treeEnvRef : vault.anim === 'fetch' ? remoteChipRef : localChipRef}
              toRef={vault.anim === 'push' ? remoteChipRef : vault.anim === 'decrypt' ? treeEnvRef : localChipRef}
              encrypted={vault.anim !== 'decrypt'}
            />
          )}
        </div>
      </div>
      {!reduced && <DemoProgress reporter={progressReporterRef} />}
    </section>
  );
}
