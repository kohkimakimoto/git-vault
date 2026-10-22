# git-vault

<p align="center">
  <img alt="git-vault logo" src="./assets/logo.svg">
</p>

<p align="center">Store encrypted files in an orphan Git branch, separate from your application code.</p>

Managing secrets such as API keys and passwords means balancing risk against operational cost. There are many ways to do it; for smaller projects, encrypting secret files and committing them to the repository can be a practical choice.

`git vault` supports that workflow. It keeps files such as `.env` encrypted on a dedicated branch in the same repository, so secrets can be managed alongside the code using familiar Git workflows, without adding encrypted files or configuration to the application branch.

This approach has limits: encrypted secrets are copied when the repository is cloned and remain in commit history, making complete deletion difficult. git-vault was built for projects where the convenience of keeping code and secrets in one repository is worth that trade-off.

## Requirements

git-vault is an external Git subcommand: Git allows an executable named `git-xxx` on your PATH to be invoked as `git xxx` (see the [Git documentation on PATH](https://git-scm.com/docs/git#Documentation/git.txt-PATH)). The `git-vault` executable is a Python script that uses [age](https://github.com/FiloSottile/age) for encryption and Git for storage, with no third-party Python packages. To run it, you need:

- Python 3.11 or later
- Git
- age (`age-keygen` is useful for generating keys and required by the tests)
- macOS or Linux

## Installation

### Homebrew

```sh
brew install kohkimakimoto/tap/git-vault
```

This also installs [age](https://github.com/FiloSottile/age) as a Homebrew dependency.

### Manual installation

Place [`bin/git-vault`](bin/git-vault) somewhere on your `PATH` and make it executable.

## Quick start

From the root of your application repository, create an age identity for this clone and point `vault.identity` at it (see [Recommended practice and limits](#recommended-practice-and-limits)):

```sh
# Generate an age identity inside the local Git directory (not pushed)
age-keygen -o .git/vaultkey.txt
chmod 600 .git/vaultkey.txt

# Absolute path via $PWD (required by vault.identity)
git config vault.identity "$PWD/.git/vaultkey.txt"
```

`age-keygen` writes an identity file in this form (and also prints the public key):

```
# created: 2026-10-17T21:53:43+09:00
# public key: age19438ccrwjqpmjhjpvp40aclyjnpllhgru62uak84knzs5n4k3y6q6ej2tq
AGE-SECRET-KEY-14S4CNP040N60QYYWSMGQ2225PSWKSHRCFRSW6954MY2XHC2T9U4QNV05FQ
```

The `AGE-SECRET-KEY-...` line is the private key. The `# public key: age...` comment is the matching public key. Pass that public key to `-r` when you initialize a vault or add recipients. Keep the identity file private; git-vault stores public keys only, never the private key.

```sh
# Create the orphan vault branch with the given public key
git vault init -r age...

# Encrypt .env and commit it to the vault branch
git vault save .env

# List paths saved in the vault
git vault list

# Publish the vault branch to the remote
git push origin vault
```

`init` creates an orphan `vault` branch whose tree holds encrypted files and the public keys used for encryption. Every update adds a commit to that branch. Your current checkout, application branch, and index are left alone. There is no need to switch to the vault branch.

`save` keeps the original plaintext file. **You are responsible for excluding plaintext from Git**, for example with your own `.gitignore`. git-vault does not inspect or modify ignore settings.

To restore a missing file (using the private key from `vault.identity`):

```sh
git vault restore .env
```

Use `-f` to overwrite an existing file:

```sh
git vault restore -f .env
```

## Profiles

Profiles group files and recipients in the same vault branch. `init` creates a `default` profile implicitly.

```sh
# Create a production profile with its own public key
git vault profiles add production -r age...

# Encrypt .env into the production profile
git vault save -p production .env

# List paths saved in the production profile
git vault list -p production

# List all profiles on the vault branch
git vault profiles list

# Restore .env from production, overwriting if it already exists
git vault restore -p production -f -i /path/to/identity .env
```

The same path can be saved in multiple profiles. Restoring different profiles writes to the same working-tree path. `default` is selected when `-p` is omitted.

```sh
# Re-save every path already registered in this profile.
git vault save -p production -a

# Restore every file in this profile.
git vault restore -p production -a -f -i /path/to/identity

# Remove a saved file, keeping its plaintext and past commits.
git vault remove -p production .env

# Only empty, non-default profiles can be removed.
git vault profiles remove production
```

`save -a` does not discover new files. Register them with explicit paths first. If any registered source file is missing, the entire save fails.

## Private key input

Identity is required only when decrypting (restore, or recipients add/remove when the profile has files). Resolve it as follows:

1. `-i` / `--identity PATH`. Use `-i -` to read an identity from stdin. Overrides `vault.identity`.
2. Otherwise `git config vault.identity` (see below).

```sh
# Restore with an explicit identity file
git vault restore -i /path/to/identity .env

# Read the identity from stdin via redirection
git vault restore -i - .env < /path/to/identity

# Same via a pipe; -a restores every saved path in the profile
cat /path/to/identity | git vault restore -a -i -

# Repository-local default (absolute path; see Recommended practice and limits)
git config vault.identity "$PWD/.git/vaultkey.txt"

# Restore using vault.identity (no -i)
git vault restore .env
```

`-i -` is read once per operation into a temporary file and reused for every decrypt in that operation. Do not combine `-i -` with `-R -`. Multiple native age secrets belong in one identity file (age's multi-line format). Multiple SSH private key files cannot be supplied in a single operation.

### Passphrase-protected identity files

age can wrap an identity in a passphrase-encrypted file. git-vault accepts that form for `-i` and `vault.identity`:

```sh
# Create a passphrase-protected identity (age prompts for the passphrase)
age-keygen | age -p > .git/vaultkey.txt
chmod 600 .git/vaultkey.txt
git config vault.identity "$PWD/.git/vaultkey.txt"
```

When the identity file is passphrase-protected, git-vault unlocks it **once per operation** (age reads the passphrase from the terminal) and reuses the unlocked key for every decrypt in that operation—for example `restore -a` or `recipients add` when the profile has many files. The unlocked key lives only in a temporary file for the duration of the command. Non-interactive environments without a terminal cannot unlock these identities; use a plaintext identity file there, or unlock ahead of time by other means.

The raw `AGE-SECRET-KEY-...` form remains supported and needs no passphrase prompt.

### `vault.identity`

Set a default identity file path with `git config` (the path to the file, not the key material). The value must be an **absolute path** or start with `~`. Prefer a **repository-local** setting. The recommended layout is described under [Recommended practice and limits](#recommended-practice-and-limits).

```sh
# From the repository root: absolute path via $PWD
git config vault.identity "$PWD/.git/vaultkey.txt"
```

This writes into the repository's Git config (typically `.git/config`), for example:

```ini
[vault]
	identity = /path/to/repo/.git/vaultkey.txt
```

`git config --global vault.identity ...` is supported but not recommended for day-to-day use: it points every repository at the same default and encourages sharing one key across unrelated lifecycles.

## Recipients

A recipient is who may use a profile's secrets (a person, bot, or role). Each recipient is a public key (for example `age...` / `age1pq1...`, or SSH keys such as `ssh-ed25519` / `ssh-rsa`). Labels are git-vault metadata; encryption uses the public key. See age's documentation for supported key types.

Each profile stores recipients as JSON at `<profile>/recipients.json`. CLI input uses `-r` / `-R`:

```sh
# List recipients in the production profile
git vault recipients list -p production

# Same list as canonical JSON
git vault recipients list -p production --json

# Add a public key with a label (re-encrypts saved files when needed)
git vault recipients add -p production -i /path/to/identity -l "deploy bot" -r age...

# Add public keys from a recipients file
git vault recipients add -p production -i /path/to/identity -R ~/.ssh/id_ed25519.pub

# Remove a public key (re-encrypts saved files when needed)
git vault recipients remove -p production -i /path/to/identity -r age...

# Initialize a vault from a recipients file instead of -r
git vault init -R teammates.txt
```

Provide recipients with `-r KEY` or `-R PATH` (the two cannot be combined). `-R` may list several keys, one per line. Optional `-l` / `--label` attaches a non-unique description when adding via `init`, `profiles add`, or `recipients add`: omit labels, or pass one label per key. For `-R`, labels follow the file's key order, excluding empty lines and comment lines. Labels cannot be changed later except by removing and re-adding the recipient.

`recipients add` and `recipients remove` do not only edit the public key list. When the profile has saved files, git-vault must **decrypt every ciphertext with a private identity, then re-encrypt it for the updated public keys**, and commit the new list and ciphertexts together. That is why a private key is required unless the profile is empty: age ciphertext cannot be rewritten from public keys alone. If any decryption or encryption fails, the branch is not updated. The last public key cannot be removed.

Among CLI commands, only these operations need a private identity:

- `recipients add` / `recipients remove` — decrypt then re-encrypt (when files exist)
- `restore` — decrypt into the working tree

`save`, `init`, `profiles add`, and similar commands use public keys only.

## Commit messages

All operations that create commits accept `-m` or `-F`:

```sh
# Set the commit message with -m
git vault save -m "Rotate database credentials" .env

# Repeat -m for separate paragraphs
git vault save -m "Update secrets" -m "Use the new database" .env

# Read the commit message from a file
git vault save -F /path/to/message.txt .env
```

Repeat `-m` to separate paragraphs. `-F` reads a UTF-8 file; reading the message from stdin with `-F -` is not supported. Messages cannot be empty.

When omitted, messages are generated with a `git-vault:` prefix:

```text
git-vault: Save files in profile production

.env
```

Explicit messages are used without a prefix or format marker. Commit messages are not encrypted; do not put secrets in them. Git's usual author configuration is used. Set `user.name` and `user.email` if necessary.

## Working branches and pull requests

`-b` always names the local branch to operate on. `init` creates that branch and rejects an existing name. Other commands require an existing branch, unless the command supports `-n` and you pass it to create a new one. This prevents a typo from creating a branch.

```sh
# Update remote-tracking branches (including origin/vault)
git fetch origin

# Create a working branch from the fetched vault tip and save a change
git vault save -p production -b vault-update-db -n -B origin/vault .env

# Add another commit to the existing working branch
git vault save -p production -b vault-update-db credentials.json

# Publish the working branch for a pull request
git push origin vault-update-db
```

Create a pull request from `vault-update-db` to `vault` using your hosting service. If `-B` is omitted, new branches start from the local `vault` branch. `-n` requires an explicit `-b`, and fails if that branch already exists. `-B` requires `-n`.

Working branches are also available for `remove`, `profiles add/remove`, and `recipients add/remove`. Creation is committed only after the operation succeeds. A vault branch checked out in any worktree cannot be updated by git-vault.

Git cannot have both `vault` and `vault/update-db` branches. Use names such as `vault-update-db` for working branches.

## Cloning and synchronization

Remote operations use ordinary Git commands; git-vault never fetches or pushes. After cloning the application branch, create a local vault branch from the remote:

```sh
# Fetch remote refs after cloning the application branch
git fetch origin

# Create a local vault branch tracking the remote vault
git branch --track vault origin/vault

# Restore every saved file into the working tree
git vault restore -a -i /path/to/identity
```

This does not change your checkout. Skip the branch creation if local `vault` already exists. To fast-forward an existing local vault branch from the remote:

```sh
git fetch origin vault:vault
```

A plain `git fetch origin` normally updates `origin/vault`, not local `vault`. If your local and remote vault branches diverge, retain the plaintext changes you need and reapply them on a new branch from the latest `origin/vault`. The tool does not merge ciphertext or force-push.

For pull requests, reapply changes if recipients in the same profile changed since the working branch was created. Git may merge a recipients change and a different file change without a text conflict, even though the resulting ciphertext does not match the recipients. Process those changes against the latest vault state. Merge and squash commit messages need no special prefix or trailer.

## Recommended practice and limits

git-vault stores ciphertext in Git history. Removing a recipient from the current tip does **not** make that identity useless against older commits, and rewriting or deleting remote history cannot control every clone that already exists. Treat access control as: current tip ACL, private-key custody, and (when needed) rotating the underlying secret values—not as complete cryptographic erasure of the past.

### One identity per person per clone

Prefer a dedicated age identity for each developer **and** each repository clone, not a shared development key and not one personal key reused across projects. Different repositories revoke access on different schedules; sharing a private key makes disposal hard.

Keep that identity's lifecycle tied to the clone: store the private key inside the local Git directory and point repository-local `vault.identity` at it (absolute path). From the repository root:

```sh
age-keygen -o .git/vaultkey.txt
chmod 600 .git/vaultkey.txt
git config vault.identity "$PWD/.git/vaultkey.txt"
```

Optionally wrap that identity with a passphrase (`age-keygen | age -p > .git/vaultkey.txt`) so the raw secret is not stored in plaintext on disk. See [Passphrase-protected identity files](#passphrase-protected-identity-files).

Give only the public key to the repository administrator for `init`, `profiles add`, or `recipients add`. The file under `.git/` is local to this clone and is not pushed. Deleting the clone directory from disk removes this working copy's key with it. That makes disposal easier; it does not dispose of copies elsewhere (other machines, backups, or a second clone). If you discard a clone while still developing, generate a new key for the next clone and have the administrator register the new public key (a master identity can restore and re-add as needed).

Avoid `git config --global vault.identity` for day-to-day use.

### Master key

Include one privileged public key in **every** profile (for example at `init` and each `profiles add`), and keep that identity available for `recipients add` / `remove` and emergency restore across profiles.

Treat that identity as high privilege: it can decrypt the current snapshot of every profile where it is listed. Store it offline or with strict access control, prefer a clear `-l` label such as `master`, and avoid using it as the day-to-day key for routine restore when a narrower key is enough. Do not keep the master private key in a developer clone's `.git/vaultkey.txt`.

### What `recipients remove` does not do

`recipients remove` updates the **current** vault tip only: it re-encrypts saved files for the remaining public keys and commits that snapshot. It does **not**:

- Revoke access to historical commits (ciphertext in older commits stays encrypted to whoever was listed then)
- Dispose of anyone's private key

Repository-side removal is easy to misread as “that identity is now useless.” It is not. Anyone who still holds a private key that was a recipient at some past commit can decrypt those historical blobs if they still have the Git objects. After remove and re-encryption, that person should no longer reach **newly saved** secrets in that vault—treat remove alone as incomplete offboarding.

### Offboarding

When someone should lose access:

1. Remove their public key from every profile that listed it (`recipients remove`), using a remaining privileged identity (typically the master key).
2. Have them **delete the local clone from disk** so `.git/vaultkey.txt` for that repository goes with it. Also drop any other copies of that identity (other machines, backups, password managers, CI secrets). Keeping the folder after access is revoked leaves the private key in place.
3. If past values must become useless even to someone who still holds an old identity or an old clone, rotate those secret values in the application and `save` again under the updated recipients.

Rewriting remote vault history is optional hygiene for new clones; it does not control existing copies of old commits.

Secret management has to be designed around constraints, operational practice, and risk assessment; there is no single simple answer. The guidance above is one recommended approach—use it only after judging whether it fits your project.

## Command reference

Options follow the operation: `git vault save -p production .env`, or `git vault recipients add -p production -r age...`.

Paths are relative to the current directory; `-a` uses stored repository-relative paths. Use `--` before file names beginning with `-`. Force does not bypass symlink, path, or concurrent-update checks. Commit messages are public; never include secrets. When `-m` and `-F` are omitted, a message with a `git-vault:` prefix is generated.

### `init`

```sh
git vault init [options] (-r KEY | -R PATH) [-l TEXT]...
```

Create a local orphan vault branch (default name `vault`) with a `default` profile. The branch must not already exist. Its tree is separate from application history and holds encrypted files plus the public keys used for encryption. This command creates the branch itself and does not accept `-n` or `-B`. Your checkout, application branch, and index are left alone. Recipients are required via `-r` or `-R`.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to create (default: `vault`). |
| `-r`, `--recipient KEY` | Public key. Cannot be combined with `-R`. |
| `-R`, `--recipients-file PATH` | Recipients file; `-` for stdin. Cannot be combined with `-r`. |
| `-l`, `--label TEXT` | Optional label; omit, or one per key (`-r`) / per `-R` key line. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Cannot be combined with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Cannot be combined with `-m`. |
| `-h`, `--help` | Show help. |

### `profiles list`

```sh
git vault profiles list [options]
```

List all profiles in the selected branch.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-h`, `--help` | Show help. |

### `profiles add`

```sh
git vault profiles add [options] NAME (-r KEY | -R PATH) [-l TEXT]...
```

Create the profile named `NAME` with its own recipients and no files. The profile must not already exist. Profile names begin with an ASCII letter or digit and contain only letters, digits, `.`, `_`, and `-`. Recipients are required via `-r` or `-R`.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-r`, `--recipient KEY` | Public key. Cannot be combined with `-R`. |
| `-R`, `--recipients-file PATH` | Recipients file; `-` for stdin. Cannot be combined with `-r`. |
| `-l`, `--label TEXT` | Optional label; omit, or one per key (`-r`) / per `-R` key line. |
| `-n`, `--new-branch` | Create the named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Cannot be combined with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Cannot be combined with `-m`. |
| `-h`, `--help` | Show help. |

### `profiles remove`

```sh
git vault profiles remove [options] NAME
```

Remove the profile named `NAME`. It must be empty and cannot be `default`.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-n`, `--new-branch` | Create the named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Cannot be combined with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Cannot be combined with `-m`. |
| `-h`, `--help` | Show help. |

### `recipients list`

```sh
git vault recipients list [options]
```

List recipients for the selected profile. Default lines are `KEY` or `KEY  LABEL`. `--json` prints the canonical stored JSON.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `--json` | Print recipients as canonical JSON. |
| `-h`, `--help` | Show help. |

### `recipients add`

```sh
git vault recipients add [options] (-r KEY | -R PATH) [-l TEXT]...
```

Add public keys from `-r` / `-R`. When the profile has files, decrypt each ciphertext and re-encrypt it for the updated public keys in one commit. Existing public keys are rejected. A private identity is needed for that decrypt step unless the profile is empty.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-r`, `--recipient KEY` | Public key to add. Cannot be combined with `-R`. |
| `-R`, `--recipients-file PATH` | Recipients file; `-` for stdin. Cannot be combined with `-r`. |
| `-i`, `--identity PATH` | Identity for re-encryption. Use `-i -` for stdin, or `vault.identity`. Not needed when the profile has no files. |
| `-l`, `--label TEXT` | Optional label; omit, or one per key / per `-R` key line. |
| `-n`, `--new-branch` | Create the named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Cannot be combined with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Cannot be combined with `-m`. |
| `-h`, `--help` | Show help. |

### `recipients remove`

```sh
git vault recipients remove [options] (-r KEY | -R PATH)
```

Remove public keys from `-r` / `-R`. When the profile has files, decrypt each ciphertext and re-encrypt it for the remaining public keys in one commit. Unknown keys and removal of the last public key are rejected. A private identity is needed for that decrypt step unless the profile is empty. Past commits are unchanged.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-r`, `--recipient KEY` | Public key to remove. Cannot be combined with `-R`. |
| `-R`, `--recipients-file PATH` | Recipients file of keys to remove; `-` for stdin. Cannot be combined with `-r`. |
| `-i`, `--identity PATH` | Identity for re-encryption. Use `-i -` for stdin, or `vault.identity`. Not needed when the profile has no files. |
| `-n`, `--new-branch` | Create the named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Cannot be combined with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Cannot be combined with `-m`. |
| `-h`, `--help` | Show help. |

### `save`

```sh
git vault save [options] PATH...
git vault save [options] -a
```

Encrypt files and append a commit to the selected branch. Unspecified files are retained. Source plaintext is not deleted. Without `-f`, tracked input files are rejected.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-a`, `--all` | Re-save all registered paths in the profile; cannot be combined with explicit paths. Does not discover new files. |
| `-f`, `--force` | Allow tracked input files. Read working-tree content, not the staged version; leave the index and application history unchanged. |
| `-n`, `--new-branch` | Create the named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Cannot be combined with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Cannot be combined with `-m`. |
| `-h`, `--help` | Show help. |

### `list`

```sh
git vault list [options]
```

List the original repository-relative paths saved in the selected profile.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-h`, `--help` | Show help. |

### `restore`

```sh
git vault restore [options] PATH...
git vault restore [options] -a
```

Decrypt files into the working tree. Without `-f`, existing files and tracked paths are rejected. Restored files have mode `0600`. This command does not create a commit or update the vault branch.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-i`, `--identity PATH` | Identity file. Use `-i -` for stdin, or omit and use `vault.identity`. |
| `-a`, `--all` | Restore all saved paths in the selected profile and revision; cannot be combined with explicit paths. |
| `-f`, `--force` | Overwrite existing or tracked files, including uncommitted working-tree changes; leave the index unchanged. |
| `--revision REV` | Restore from a commit reachable from the target branch (default: branch tip). |
| `-h`, `--help` | Show help. |

### `remove`

```sh
git vault remove [options] PATH...
```

Remove the specified paths from the current saved snapshot in one commit. Keep working-tree plaintext and historical commits. All specified paths must be saved in the selected profile.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-n`, `--new-branch` | Create the named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Cannot be combined with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Cannot be combined with `-m`. |
| `-h`, `--help` | Show help. |

### `version`

```sh
git vault version
```

Print the version hardcoded in the script, such as `0.10.0`. No repository or age installation is required.

| Option | Purpose |
| --- | --- |
| `-h`, `--help` | Show help. |

### `skill`

```sh
# Print the skill to stdout
git vault skill

# Install it at the default path (.agents/skills/git-vault/SKILL.md)
git vault skill -o

# Install it at a custom path
git vault skill -o .claude/skills/git-vault/SKILL.md
```

Print a self-contained agent skill as SKILL.md content to stdout. The skill explains how an AI agent should use git-vault's profiles, recipients, restore operations, and working branches. No repository or age installation is required to generate it.

Use `-o` without a path to install it at `.agents/skills/git-vault/SKILL.md`, or provide a full file path to use another location, such as `.claude/skills/git-vault/SKILL.md`. Relative paths start from the current directory. Missing parent directories are created. File mode writes the skill to the file and a confirmation to stderr, leaving stdout empty. Existing files are preserved unless `-f` is specified; symlink output files are rejected even with `-f`.

| Option | Purpose |
| --- | --- |
| `-o`, `--output [PATH]` | Write the skill to a file; an omitted path defaults to `.agents/skills/git-vault/SKILL.md`. Without this option, print to stdout. |
| `-f`, `--force` | Overwrite an existing output file; requires `-o`. |
| `-h`, `--help` | Show help. |

## Storage and scope

Each profile occupies a directory at the root of the vault branch:

```text
default/
  recipients.json
  files/
    .env
production/
  recipients.json
  files/
    .env
```

Every file under `files/` is binary age ciphertext, regardless of its name. Original relative paths are preserved without extra extensions. The recipients file is canonical JSON (`version` 1) with `key` and optional `label` fields. File names, sizes, profile names, labels, and Git metadata remain visible.

The tool is intended for small files in application repositories. It does not provide secure deletion, key storage, access revocation for old commits, or automatic conflict resolution. Removing a saved file leaves its history intact. Only regular files inside the working tree are supported; directories, symlinks, Git administration paths, and Windows are outside the initial scope. Original ownership, timestamps, and executable permissions are not preserved. Restored files have mode `0600`, and newly created directories have mode `0700`.

## Tests

```sh
./tests/run.sh
```

Each script in `tests/cases/` exercises one scenario by running `git vault` and ordinary Git/age commands directly. To run just one scenario:

```sh
bash tests/cases/03-recipients.sh
```

`tests/common.sh` contains temporary-repository setup and small assertions. Each scenario creates disposable keys and repositories, isolates personal Git configuration, and cleans up afterward. Tests cover round trips, profiles, recipient rotation and labels, working branches, messages, force handling, paths, historical restore, linked worktrees, remote divergence, failure atomicity, and agent skill output and installation.

There is no test framework or Python package dependency. Bash, Git, age, age-keygen, ssh-keygen, and Python (for git-vault itself) are required. The stdin identity test restores multiple files in one operation to verify that the identity is read once and reused. Tests never import git-vault's implementation.

## Author

Kohki Makimoto <kohki.makimoto@gmail.com>

## License

The MIT License (MIT)
