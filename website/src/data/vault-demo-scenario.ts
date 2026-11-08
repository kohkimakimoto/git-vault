export type TreeEnvState = 'present' | 'absent' | 'restored';

export type DemoMessages = {
  workflowLabel: string;
  workflowTitle: string;
  pause: string;
  resume: string;
  progress: string;
  workingTree: string;
  new: string;
  missing: string;
  vaultBranch: string;
  local: string;
  remote: string;
  empty: string;
  encryptCallout: string;
  publishCallout: string;
  saveScene: string;
  restoreScene: string;
  fetchCallout: string;
  trackCallout: string;
  restoreCallout: string;
};

export type DemoStep =
  | {
      kind: 'scene';
      label: string;
      host: string;
      tree?: TreeEnvState;
      local?: boolean;
      remote?: boolean;
      fetched?: boolean;
    }
  | { kind: 'prompt'; cwd?: string }
  | { kind: 'type'; text: string }
  | { kind: 'output'; lines: string[] }
  | { kind: 'callout'; text: string }
  | { kind: 'tree'; env: TreeEnvState }
  | {
      kind: 'vault';
      local?: boolean;
      remote?: boolean;
      fetched?: boolean;
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

export type VaultAnim = 'encrypt' | 'push' | 'fetch' | 'decrypt' | null;

export type VaultVisualState = {
  local: boolean;
  remote: boolean;
  fetched: boolean;
  anim: VaultAnim;
};

export const TYPE_MS = 58;
export const LINE_MS = 480;
export const CALLOUT_HOLD_MS = 2200;

export const SCENE_FADE_MS = 500;
export const SCENE_HOLD_MS = 2200;
export const LOOP_PAUSE_MS = 3400;
export const VAULT_ANIM_MS = 1400;


/** Static snapshot used for SSR and prefers-reduced-motion. */
export const DEMO_STATIC_LINES: TerminalLine[] = [
  { id: 's1', kind: 'command', prompt: 'dev@ci ~/app %', text: 'git fetch origin vault' },
  { id: 's2', kind: 'output', text: 'From origin  * [new branch] vault → origin/vault' },
  { id: 's3', kind: 'command', prompt: 'dev@ci ~/app %', text: 'git branch --track vault origin/vault' },
  { id: 's4', kind: 'output', text: "branch 'vault' set up to track 'origin/vault'." },
  { id: 's5', kind: 'command', prompt: 'dev@ci ~/app %', text: 'git vault restore .env' },
  { id: 's6', kind: 'output', text: 'Restored: .env' },
];

export const DEMO_STATIC_TREE: TreeEnvState = 'restored';
export const DEMO_STATIC_VAULT: VaultVisualState = {
  local: true,
  remote: true,
  fetched: false,
  anim: null,
};

export function createVaultDemoScenario(messages: DemoMessages): DemoStep[] {
  return [
    {
      kind: 'scene',
      label: messages.saveScene,
      host: 'dev@laptop',
      tree: 'present',
      local: false,
      remote: false,
      fetched: false,
    },
    { kind: 'clear' },
    { kind: 'callout', text: messages.encryptCallout },
    { kind: 'prompt', cwd: '~/app' },
    { kind: 'type', text: 'git vault save .env' },
    { kind: 'output', lines: ['Saved .env → vault (default)'] },
    { kind: 'vault', anim: 'encrypt' },
    { kind: 'vault', local: true, anim: null },
    { kind: 'pause', ms: 700 },
    { kind: 'callout', text: messages.publishCallout },
    { kind: 'prompt', cwd: '~/app' },
    { kind: 'type', text: 'git push origin vault' },
    { kind: 'output', lines: ['Enumerating objects: 5, done.', 'vault → origin/vault'] },
    { kind: 'vault', anim: 'push' },
    { kind: 'vault', remote: true, anim: null },
    { kind: 'pause', ms: 1000 },
    {
      kind: 'scene',
      label: messages.restoreScene,
      host: 'dev@ci',
      tree: 'absent',
      local: false,
      remote: true,
      fetched: false,
    },
    { kind: 'callout', text: messages.fetchCallout },
    { kind: 'prompt', cwd: '~/app' },
    { kind: 'type', text: 'git fetch origin vault' },
    { kind: 'output', lines: ['From github.com:example/app', ' * [new branch]      vault → origin/vault'] },
    { kind: 'vault', anim: 'fetch' },
    { kind: 'vault', fetched: true, anim: null },
    { kind: 'callout', text: messages.trackCallout },
    { kind: 'prompt', cwd: '~/app' },
    { kind: 'type', text: 'git branch --track vault origin/vault' },
    { kind: 'output', lines: ["branch 'vault' set up to track 'origin/vault'."] },
    { kind: 'vault', local: true, anim: null },
    { kind: 'pause', ms: 700 },
    { kind: 'callout', text: messages.restoreCallout },
    { kind: 'prompt', cwd: '~/app' },
    { kind: 'type', text: 'git vault restore .env' },
    { kind: 'output', lines: ['Restored: .env'] },
    { kind: 'vault', anim: 'decrypt' },
    { kind: 'tree', env: 'restored' },
    { kind: 'vault', anim: null },
    { kind: 'pause', ms: LOOP_PAUSE_MS },
  ];
}

export function promptLabel(host: string, cwd = '~/app'): string {
  return `${host} ${cwd} %`;
}
