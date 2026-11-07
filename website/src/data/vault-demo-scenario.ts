export type DemoStep =
  | { kind: 'scene'; label: string; host: string }
  | { kind: 'prompt'; cwd?: string }
  | { kind: 'type'; text: string }
  | { kind: 'output'; lines: string[] }
  | { kind: 'callout'; text: string }
  | { kind: 'tree'; env: 'present' | 'absent' | 'restored' }
  | {
      kind: 'vault';
      local?: boolean;
      remote?: boolean;
      anim?: 'encrypt' | 'push' | 'fetch' | 'decrypt' | null;
    }
  | { kind: 'clear' }
  | { kind: 'pause'; ms?: number };

export type TerminalLine = {
  id: string;
  kind: 'prompt' | 'command' | 'output' | 'scene';
  prompt?: string;
  text: string;
};

export type TreeEnvState = 'present' | 'absent' | 'restored';

export type VaultAnim = 'encrypt' | 'push' | 'fetch' | 'decrypt' | null;

export type VaultVisualState = {
  local: boolean;
  remote: boolean;
  anim: VaultAnim;
};

export const TYPE_MS = 58;
export const LINE_MS = 480;
export const CALLOUT_HOLD_MS = 2200;

export const SCENE_FADE_MS = 500;
export const SCENE_HOLD_MS = 1600;
export const LOOP_PAUSE_MS = 3400;
export const VAULT_ANIM_MS = 1400;


/** Static snapshot used for SSR and prefers-reduced-motion. */
export const DEMO_STATIC_LINES: TerminalLine[] = [
  { id: 's1', kind: 'command', prompt: 'dev@ci ~/app %', text: 'git fetch origin vault' },
  { id: 's2', kind: 'output', text: 'From origin  * [new branch] vault' },
  { id: 's3', kind: 'command', prompt: 'dev@ci ~/app %', text: 'git vault restore .env' },
  { id: 's4', kind: 'output', text: 'Restored: .env' },
];

export const DEMO_STATIC_CALLOUT = 'Restore the encrypted .env';
export const DEMO_STATIC_TREE: TreeEnvState = 'restored';
export const DEMO_STATIC_VAULT: VaultVisualState = {
  local: true,
  remote: true,
  anim: null,
};

export const vaultDemoScenario: DemoStep[] = [
  { kind: 'clear' },
  { kind: 'tree', env: 'present' },
  { kind: 'vault', local: false, remote: false, anim: null },
  { kind: 'callout', text: 'Encrypt .env into the vault branch' },
  { kind: 'prompt', cwd: '~/app' },
  { kind: 'type', text: 'git vault save .env' },
  { kind: 'output', lines: ['Saved .env → vault (default)'] },
  { kind: 'vault', anim: 'encrypt' },
  { kind: 'vault', local: true, anim: null },
  { kind: 'pause', ms: 700 },
  { kind: 'callout', text: 'Publish the vault branch to origin' },
  { kind: 'prompt', cwd: '~/app' },
  { kind: 'type', text: 'git push origin vault' },
  { kind: 'output', lines: ['Enumerating objects: 5, done.', 'vault → origin/vault'] },
  { kind: 'vault', anim: 'push' },
  { kind: 'vault', remote: true, anim: null },
  { kind: 'pause', ms: 1000 },
  { kind: 'scene', label: 'On another machine', host: 'dev@ci' },
  { kind: 'tree', env: 'absent' },
  { kind: 'vault', local: false, remote: true, anim: null },
  { kind: 'callout', text: 'Fetch the latest vault branch' },
  { kind: 'prompt', cwd: '~/app' },
  { kind: 'type', text: 'git fetch origin vault' },
  { kind: 'output', lines: ['From github.com:example/app', ' * [new branch]      vault → origin/vault'] },
  { kind: 'vault', anim: 'fetch' },
  { kind: 'vault', local: true, anim: null },
  { kind: 'pause', ms: 700 },
  { kind: 'callout', text: 'Restore the encrypted .env' },
  { kind: 'prompt', cwd: '~/app' },
  { kind: 'type', text: 'git vault restore .env' },
  { kind: 'output', lines: ['Restored: .env'] },
  { kind: 'vault', anim: 'decrypt' },
  { kind: 'tree', env: 'restored' },
  { kind: 'vault', anim: null },
  { kind: 'pause', ms: LOOP_PAUSE_MS },
];

export function promptLabel(host: string, cwd = '~/app'): string {
  return `${host} ${cwd} %`;
}
