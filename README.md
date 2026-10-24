# git-vault

<p align="center">
  <img alt="git-vault logo" src="./assets/logo.svg">
</p>

<p align="center">Store encrypted files in an orphan Git branch, separate from your application code.</p>

Managing secrets such as API keys and passwords means balancing risk against operational cost. There are many ways to do it; for smaller projects, encrypting secret files and committing them to the repository can be a practical choice.

`git vault` supports that workflow. It keeps files such as `.env` encrypted on a dedicated branch in the same repository, so secrets can be managed alongside the code using familiar Git workflows, without adding encrypted files or configuration to the application branch.

This approach has limits: encrypted secrets are copied when the repository is cloned and remain in commit history, making complete deletion difficult. git-vault was built for projects where the convenience of keeping code and secrets in one repository is worth that trade-off.

## Requirements

git-vault is an external Git subcommand: Git allows an executable named `git-xxx` on your PATH to be invoked as `git xxx` (see the [Git documentation on PATH](https://git-scm.com/docs/git#Documentation/git.txt-PATH)). The `git-vault` executable is a Python script that uses [age](https://github.com/FiloSottile/age) for encryption and Git for storage. To run it, you need:

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

This example encrypts and saves a `.env` file that holds application secrets. A passphrase-protected identity (private key) under each clone's local `.git` directory is recommended; see [Recommended practice and limits](#recommended-practice-and-limits).

Once, set a user-global default so every repository looks for that per-clone key (quote the value so your shell does not expand `$…`):

```sh
git config --global vault.identity '$GIT_COMMON_DIR/vaultkey.age'
```

`$GIT_COMMON_DIR` is a git-vault placeholder (not an environment variable); it expands to the absolute path from `git rev-parse --git-common-dir`. See [`vault.identity`](#vaultidentity).

From the root of your application repository, create the identity:

```sh
# Generate an identity inside the local Git directory
age-keygen | age -p > .git/vaultkey.age
chmod 600 .git/vaultkey.age
```

`age -p` prompts for a passphrase. `age-keygen` also prints the public key like the following — note it for later:

```
Public key: age1x3cxwvfsdsjkjwrp9egnvaqanveajcl86jswgnvups2he7q6ldrqprv2rr
```

> [!TIP]
> Recover the public key later from the passphrase-protected identity (prompts for the passphrase):
>
> ```sh
> age -d .git/vaultkey.age | age-keygen -y
> ```

Then initialize the vault and save a file:

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

`init` creates an orphan `vault` branch whose tree holds encrypted files and the public keys used for encryption. Every update adds a commit to that branch, without checking out the vault or changing your application branch and index.

`save` keeps the original plaintext file. **You are responsible for excluding plaintext from Git**, for example with your own `.gitignore`.

To restore a missing file (using the private key from `vault.identity`):

```sh
git vault restore .env
```

Use `-f` to overwrite an existing file:

```sh
git vault restore -f .env
```

## Profiles

Profiles group files and [recipients](#recipients) (public keys) in the same vault branch. [`init`](#init) creates a `default` profile implicitly.

```sh
# Create a production profile with its own public key
git vault profile add production -r age...

# Encrypt .env into the production profile
git vault save -p production .env

# List paths saved in the production profile
git vault list -p production

# List all profiles on the vault branch
git vault profile list

# Restore .env from production, overwriting if it already exists
git vault restore -p production -f .env
```

The same path can be saved in multiple profiles. Restoring different profiles writes to the same working-tree path. `default` is selected when `-p` is omitted.

```sh
# Re-save every path already registered in this profile.
git vault save -p production -a

# Restore every file in this profile.
git vault restore -p production -a -f

# Compare working-tree plaintext to the latest snapshot
git vault diff -p production -a

# Delete working-tree plaintext for saved paths
git vault clean -p production -a

# Remove a saved file from the current snapshot
git vault remove -p production .env

# Remove an empty, non-default profile
git vault profile remove production
```

## Private key input

Identity is required when decrypting: `restore`, `diff`, default `clean` (not `clean -f`), or `recipient add` / `remove` when the profile has files. Resolve it as follows:

1. `-i` / `--identity PATH`. Use `-i -` to read an identity from stdin. Overrides `vault.identity`.
2. Otherwise `git config vault.identity` (see below).

```sh
# Restore with an explicit identity file
git vault restore -i /path/to/identity .env

# Read the identity from stdin via redirection
git vault restore -i - .env < /path/to/identity

# Same via a pipe; -a restores every saved path in the profile
cat /path/to/identity | git vault restore -a -i -

# User-global default with a per-clone path (see Recommended practice and limits)
git config --global vault.identity '$GIT_COMMON_DIR/vaultkey.age'

# Restore using vault.identity
git vault restore .env
```

`-i -` is read once per operation into a temporary file and reused for every decrypt in that operation.

### `vault.identity`

Set a default identity file path with `git config`. The value may contain `$GIT_COMMON_DIR` or `$TOPLEVEL` (also `${…}`), which git-vault expands when it reads the config.

| Placeholder | Expands to (same idea as `git rev-parse`) |
|---|---|
| `$GIT_COMMON_DIR` | `--git-common-dir` (absolute) |
| `$TOPLEVEL` | `--show-toplevel` (absolute) |

These are git-vault placeholders in the config value, not shell or environment variables. Unknown `$NAME` / `${NAME}` forms are rejected. Prefer a **user-global** setting with `$GIT_COMMON_DIR` so each clone keeps its own key under `.git/`. See [Recommended practice and limits](#recommended-practice-and-limits).

```sh
# Once per user machine (quote so the shell leaves $… alone)
git config --global vault.identity '$GIT_COMMON_DIR/vaultkey.age'
```

This writes into `~/.gitconfig`, for example:

```ini
[vault]
	identity = $GIT_COMMON_DIR/vaultkey.age
```

## Recipients

A recipient is who may use a profile's secrets (a person, bot, or role). Each recipient is an age public key (for example `age1...`). Labels are git-vault metadata; encryption uses the public key.

Each profile stores recipients as JSON at `<profile>/recipients.json`. CLI input uses `-r` / `-R`:

```sh
# List recipients in the production profile
git vault recipient list -p production

# Same list as canonical JSON
git vault recipient list -p production --json

# Add a public key with a label (re-encrypts saved files when needed)
git vault recipient add -p production -l "deploy bot" -r age...

# Add public keys from a recipients file
git vault recipient add -p production -R teammates.txt

# Remove a public key (re-encrypts saved files when needed)
git vault recipient remove -p production -r age...

# Initialize a vault from a recipients file
git vault init -R teammates.txt
```

Provide recipients with `-r KEY` or `-R PATH` (not both). `-R` may list several keys, one per line. Optional `-l` / `--label` attaches a non-unique description when adding via `init`, `profile add`, or `recipient add`: omit labels, or pass one label per key. For `-R`, labels follow the file's key order, skipping blank and comment lines. To change a label, remove and re-add the recipient.

When the profile has saved files, `recipient add` and `recipient remove` decrypt every ciphertext with a private identity, re-encrypt for the updated public keys, and commit the list and ciphertexts together. The last public key cannot be removed. If any step fails, the branch is left unchanged.

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

Repeat `-m` to separate paragraphs. `-F` reads a UTF-8 file (`-F -` is unsupported). Messages cannot be empty.

When omitted, a message with a `git-vault:` prefix is generated:

```text
git-vault: Save files in profile production

.env
```

Commit messages are public; do not put secrets in them. Git uses the usual `user.name` / `user.email` author configuration.

## Working branches and pull requests

`-b` names the local branch to operate on. `init` creates that branch and rejects an existing name. Other commands require an existing branch, unless you pass `-n` (where supported) to create one.

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

Create a pull request from `vault-update-db` to `vault` using your hosting service. If `-B` is omitted, new branches start from the local `vault` branch. `-n` requires an explicit `-b` and fails if that branch already exists. `-B` requires `-n`.

The same `-b` / `-n` / `-B` options apply to `remove`, `profile add/remove`, and `recipient add/remove`. Creation is committed only after the operation succeeds. A vault branch checked out in any worktree cannot be updated. Prefer names such as `vault-update-db`; Git cannot have both `vault` and `vault/update-db`.

## Cloning and synchronization

Remote operations use ordinary Git commands. After cloning the application branch, create a local vault branch from the remote:

```sh
# Fetch remote refs after cloning the application branch
git fetch origin

# Create a local vault branch tracking the remote vault
git branch --track vault origin/vault

# Restore every saved file into the working tree
git vault restore -a
```

Skip the branch creation if local `vault` already exists. To fast-forward an existing local vault branch from the remote:

```sh
git fetch origin vault:vault
```

A plain `git fetch origin` normally updates `origin/vault`, not local `vault`. If local and remote vault branches diverge, keep the plaintext you need and reapply it on a new branch from the latest `origin/vault`.

For pull requests, reapply changes if recipients in the same profile changed since the working branch was created. A conflict-free Git merge of a recipients update with other file changes can still leave ciphertext that does not match the recipients list.

## Recommended practice and limits

git-vault stores ciphertext in Git history, and every clone receives those objects. Access depends on those objects plus local private keys. Cutting off access from the remote alone is difficult.

The practice below uses one identity per repository clone so disposal is concrete (delete the clone and its local identity file) and keys stay scoped to a single project lifecycle.

### Master key

Repository administrators should include one privileged public key in **every** profile (for example at `init` and each `profile add`), and keep that identity available for `recipient add` / `remove` and emergency restore across profiles.

Treat that identity as high privilege: it can decrypt the current snapshot of every profile where it is listed. Store it offline or with strict access control, prefer a clear `-l` label such as `master`, and avoid using it as the day-to-day key for routine restore when a narrower key is enough. Do not keep the master private key in a developer clone's `.git/vaultkey.age`.

### Recommended workflow

1. Developers who clone the repository: once per machine, set a user-global default so every repository looks for that clone's local key file (quote the value so your shell does not expand `$…`):

   ```sh
   git config --global vault.identity '$GIT_COMMON_DIR/vaultkey.age'
   ```

   Do not set `--global vault.identity` to a single absolute private-key path shared by every repository.

2. **Per repository clone, create a passphrase-protected identity** under the local Git directory:

   ```sh
   age-keygen | age -p > .git/vaultkey.age
   chmod 600 .git/vaultkey.age
   ```

   Use one identity per clone—not a shared team key, and not one personal key reused across unrelated projects. Different repositories revoke access on different schedules; sharing a private key makes disposal hard.

   A passphrase is recommended: if you forget to dispose of the key file, an attacker or another process that finds it still cannot use it without the passphrase, and local automation such as AI agents is less likely to unlock it unintentionally. Evaluate convenience against that trade-off; a plaintext identity is also worth considering.

3. **Give only the public key** (the `Public key: age1...` line from `age-keygen`) to the repository administrator. Do not send the identity file or the passphrase.

4. **The repository administrator registers that public key** on the profiles the person needs (`recipient add`, or at `init` / `profile add`), using a [master identity](#master-key) when the profile already has files. Register the person only on profiles they should decrypt—narrow when you can; the same public key may be listed on more than one profile when that matches how they work.

5. **Fetch or update the local `vault` branch** from the remote (see [Cloning and synchronization](#cloning-and-synchronization)).

6. **Development:** `restore` the profiles and paths you need for ongoing work. Those plaintext files stay in the working tree until you delete them yourself or run `clean`. Exclude plaintext from the application branch (for example with `.gitignore`).

7. **Deploy or other short-lived use:** those jobs often need production secrets whose leakage is high risk, so keep plaintext on disk only for as long as the job runs. Restore only the secrets that job needs, run the command, then `clean` those paths:

   ```sh
   git vault restore -p production -f .env
   ./deploy.sh
   git vault clean -p production -f .env
   ```

8. **Automation (CI, bots):** non-interactive jobs usually cannot unlock a passphrase-protected identity. Use a **separate plaintext identity** registered only on the profiles the job needs. Do not reuse a human's `.git/vaultkey.age` or passphrase in CI.

Deleting the clone directory removes that working copy's `.git/vaultkey.age`. Copies elsewhere (other machines, backups, or a second clone) remain. If you still need the identity after removing a clone, move or back up `.git/vaultkey.age` first and reuse it in the next clone. If the file is already gone, generate a new identity and have the repository administrator register the new public key.

### After `recipient remove`

`recipient remove` re-encrypts the **current** tip for the remaining public keys. Older commits stay encrypted to whoever was listed then, and private keys elsewhere are untouched. After remove, that identity should no longer decrypt **newly saved** secrets; treat repository-side removal alone as incomplete offboarding.

### Offboarding

When someone should lose access:

1. Remove their public key from every profile that listed it (`recipient remove`), using a remaining privileged identity (typically the master key).
2. Have them **delete the local clone from disk** so `.git/vaultkey.age` (or any plaintext identity file) for that repository goes with it. Also drop any other copies of that identity (other machines, backups, password managers, CI secrets). Keeping the folder after access is revoked leaves the private key material in place.
3. If past values must become useless even to someone who still holds an old identity or an old clone, rotate those secret values in the application and `save` again under the updated recipients.

Secret management has to be designed around constraints, operational practice, and risk assessment. Use the guidance above only after judging whether it fits your project.

## Command reference

Options follow the operation: `git vault save -p production .env`, or `git vault recipient add -p production -r age...`.

Paths are relative to the current directory; `-a` uses stored repository-relative paths. Use `--` before file names beginning with `-`. When `-m` and `-F` are omitted, a message with a `git-vault:` prefix is generated.

### `init`

```sh
git vault init [options] (-r KEY | -R PATH) [-l TEXT]...
```

Create a local orphan vault branch (default name `vault`) with a `default` profile and a root `README.md` describing the branch. The branch must not already exist. Recipients are required via `-r` or `-R`.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to create (default: `vault`). |
| `-r`, `--recipient KEY` | Public key (not with `-R`). |
| `-R`, `--recipients-file PATH` | Recipients file; `-` for stdin (not with `-r`). |
| `-l`, `--label TEXT` | Optional label; omit, or one per key (`-r`) / per `-R` key line. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs (not with `-F`). |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file (not with `-m`). |
| `-h`, `--help` | Show help. |

### `profile list`

```sh
git vault profile list [options]
```

List all profiles in the selected branch.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-h`, `--help` | Show help. |

### `profile add`

```sh
git vault profile add [options] NAME (-r KEY | -R PATH) [-l TEXT]...
```

Create the profile named `NAME` with its own recipients and no files. The profile must not already exist. Profile names begin with an ASCII letter or digit and contain only letters, digits, `.`, `_`, and `-`. Recipients are required via `-r` or `-R`.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-r`, `--recipient KEY` | Public key (not with `-R`). |
| `-R`, `--recipients-file PATH` | Recipients file; `-` for stdin (not with `-r`). |
| `-l`, `--label TEXT` | Optional label; omit, or one per key (`-r`) / per `-R` key line. |
| `-n`, `--new-branch` | Create the named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs (not with `-F`). |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file (not with `-m`). |
| `-h`, `--help` | Show help. |

### `profile remove`

```sh
git vault profile remove [options] NAME
```

Remove the profile named `NAME`. It must be empty and cannot be `default`.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-n`, `--new-branch` | Create the named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs (not with `-F`). |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file (not with `-m`). |
| `-h`, `--help` | Show help. |

### `recipient list`

```sh
git vault recipient list [options]
```

List recipients for the selected profile. Default lines are `KEY` or `KEY  LABEL`. `--json` prints the canonical stored JSON.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `--json` | Print recipients as canonical JSON. |
| `-h`, `--help` | Show help. |

### `recipient add`

```sh
git vault recipient add [options] (-r KEY | -R PATH) [-l TEXT]...
```

Add public keys from `-r` / `-R`. When the profile has files, decrypt each ciphertext and re-encrypt it for the updated public keys in one commit. Existing public keys are rejected. A private identity is required unless the profile is empty.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-r`, `--recipient KEY` | Public key to add (not with `-R`). |
| `-R`, `--recipients-file PATH` | Recipients file; `-` for stdin (not with `-r`). |
| `-i`, `--identity PATH` | Identity for re-encryption. Use `-i -` for stdin, or `vault.identity`. Optional when the profile has no files. |
| `-l`, `--label TEXT` | Optional label; omit, or one per key / per `-R` key line. |
| `-n`, `--new-branch` | Create the named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs (not with `-F`). |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file (not with `-m`). |
| `-h`, `--help` | Show help. |

### `recipient remove`

```sh
git vault recipient remove [options] (-r KEY | -R PATH)
```

Remove public keys from `-r` / `-R`. When the profile has files, decrypt each ciphertext and re-encrypt it for the remaining public keys in one commit. Unknown keys and removal of the last public key are rejected. A private identity is required unless the profile is empty. Older commits are left as they are.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-r`, `--recipient KEY` | Public key to remove (not with `-R`). |
| `-R`, `--recipients-file PATH` | Recipients file of keys to remove; `-` for stdin (not with `-r`). |
| `-i`, `--identity PATH` | Identity for re-encryption. Use `-i -` for stdin, or `vault.identity`. Optional when the profile has no files. |
| `-n`, `--new-branch` | Create the named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs (not with `-F`). |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file (not with `-m`). |
| `-h`, `--help` | Show help. |

### `save`

```sh
git vault save [options] PATH...
git vault save [options] -a
```

Encrypt files and append a commit to the selected branch. Unspecified files are retained. Source plaintext remains. Without `-f`, tracked input files are rejected.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-a`, `--all` | Re-save all registered paths in the profile; cannot be combined with explicit paths. |
| `-f`, `--force` | Allow tracked input files. Reads working-tree content (not the index). |
| `-n`, `--new-branch` | Create the named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs (not with `-F`). |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file (not with `-m`). |
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

Decrypt files into the working tree. Without `-f`, existing files and tracked paths are rejected. Restored files have mode `0600`.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-i`, `--identity PATH` | Identity file. Use `-i -` for stdin, or omit and use `vault.identity`. |
| `-a`, `--all` | Restore all saved paths in the selected profile and revision; cannot be combined with explicit paths. |
| `-f`, `--force` | Overwrite existing or tracked files, including uncommitted working-tree changes. |
| `--revision REV` | Restore from a commit reachable from the target branch (default: branch tip). |
| `-h`, `--help` | Show help. |

### `remove`

```sh
git vault remove [options] PATH...
```

Remove the specified paths from the current saved snapshot in one commit. Working-tree plaintext and older commits stay. All specified paths must be saved in the selected profile.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-n`, `--new-branch` | Create the named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs (not with `-F`). |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file (not with `-m`). |
| `-h`, `--help` | Show help. |

### `diff`

```sh
git vault diff [options] PATH...
git vault diff [options] -a
```

Compare working-tree plaintext to the latest saved snapshot in the selected profile. Prints a unified diff for each changed path (`a/<path>` is the vault tip, `b/<path>` is the working tree). Missing paths are reported as absent. Exit status is `1` when any selected path differs, otherwise `0`. Diffs contain secrets.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-i`, `--identity PATH` | Identity file. Use `-i -` for stdin, or omit and use `vault.identity`. |
| `-a`, `--all` | Diff all saved paths in the profile; cannot be combined with explicit paths. |
| `-h`, `--help` | Show help. |

### `clean`

```sh
git vault clean [options] PATH...
git vault clean [options] -a
```

Delete working-tree plaintext for the selected saved paths. Paths must be registered in the profile. Missing files are reported as absent.

Without `-f`, an identity is required. git-vault decrypts the tip and compares every existing selected path to the working tree first. If any path differs, it prints those unified diffs and exits with status `1`. If every existing path matches, those files are deleted.

With `-f`, delete the current file at each selected path unconditionally (including unsaved edits, tracked files, and content restored from another profile).

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-i`, `--identity PATH` | Identity for the default compare step. Use `-i -` for stdin, or omit and use `vault.identity`. Ignored with `-f`. |
| `-a`, `--all` | Clean all saved paths in the profile; cannot be combined with explicit paths. |
| `-f`, `--force` | Delete unconditionally. |
| `-h`, `--help` | Show help. |

### `version`

```sh
git vault version
```

Print the version (currently `0.11.0`).

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

Print agent skill content (SKILL.md) to stdout. The skill covers profiles, recipients, restore, and working branches.

Use `-o` without a path to write `.agents/skills/git-vault/SKILL.md`, or pass another file path such as `.claude/skills/git-vault/SKILL.md`. Relative paths start from the current directory; missing parents are created. File mode writes the skill to the file and a confirmation to stderr. Existing files need `-f`; symlink targets are always rejected.

| Option | Purpose |
| --- | --- |
| `-o`, `--output [PATH]` | Write the skill to a file; an omitted path defaults to `.agents/skills/git-vault/SKILL.md`. Without this option, print to stdout. |
| `-f`, `--force` | Overwrite an existing output file; requires `-o`. |
| `-h`, `--help` | Show help. |

## Storage and scope

Each profile occupies a directory at the root of the vault branch. A `README.md` at that root explains that the branch is managed by git-vault:

```text
README.md
default/
  recipients.json
  files/
    .env
production/
  recipients.json
  files/
    .env
```

Ciphertext lives under `<profile>/files/` at the original relative path. Recipients are canonical JSON (`version` 1) with `key` and optional `label`. File names, sizes, profile names, labels, and Git metadata are visible in the repository. `README.md` at the branch root is reserved and cannot be a profile name.

Intended for small regular files in the working tree on macOS or Linux. Restored files have mode `0600`; newly created directories have mode `0700`.

## Tests

```sh
./tests/run.sh
```

Each script in `tests/cases/` exercises one scenario by running `git vault` and ordinary Git/age commands directly. To run just one scenario:

```sh
bash tests/cases/03-recipients.sh
```

`tests/common.sh` contains temporary-repository setup and small assertions. Each scenario creates disposable keys and repositories, isolates personal Git configuration, and cleans up afterward. Requires Bash, Git, age, age-keygen, and Python.

## Author

Kohki Makimoto <kohki.makimoto@gmail.com>

## License

The MIT License (MIT)
