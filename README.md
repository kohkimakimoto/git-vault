# git-vault

Store encrypted files in a Git branch, separate from your application code.

Managing secrets such as API keys and passwords means balancing risk against
operational cost. There are many ways to do it; for smaller projects, encrypting
secret files and committing them to the repository can be a practical choice.

`git vault` supports that workflow. It keeps files such as `.env` encrypted on a
dedicated branch in the same repository, so secrets can be managed alongside the
code using familiar Git workflows, without adding encrypted files or configuration
to the application branch.

This approach has limits: encrypted secrets are copied when the repository is
cloned and remain in commit history, making complete deletion difficult.
git-vault was built for projects where the convenience of keeping code and secrets
in one repository is worth that trade-off.

## Requirements

git-vault is an external Git subcommand: Git allows an executable named `git-xxx`
on your PATH to be invoked as `git xxx` (see the
[Git documentation on PATH](https://git-scm.com/docs/git#Documentation/git.txt-PATH)).
The `git-vault` executable is a Python script that uses
[age](https://github.com/FiloSottile/age) for encryption and Git for storage, with
no third-party Python packages. To run it, you need:

- Python 3.11 or later
- Git
- age (`age-keygen` is useful for generating keys and required by the tests)
- macOS or Linux

## Installation

### Homebrew

```sh
brew install kohkimakimoto/tap/git-vault
git vault version
```

The [Homebrew formula](https://github.com/kohkimakimoto/homebrew-tap/blob/main/Formula/git-vault.rb)
installs age automatically. Python 3.11 or later and Git must be available on your
PATH.

### Manual installation

Copy `bin/git-vault` to a directory on your PATH:

```sh
mkdir -p "$HOME/.local/bin"
install -m 755 bin/git-vault "$HOME/.local/bin/git-vault"
# Add $HOME/.local/bin to PATH if it is not already there.
git vault --help
```

For development, add this repository's `bin` directory to PATH instead.

## Quick start

Create an age identity outside the repository, or use an existing one:

```sh
mkdir -p "$HOME/.config/age"
age-keygen -o "$HOME/.config/age/key.txt"
```

The output includes a public recipient beginning with `age1`. Keep the identity
file private; git-vault stores public recipients, never the private identity.

Inside your application repository:

```sh
git vault init -r age1...
git vault save .env
git vault list
git push origin vault
```

`init` creates an independent `vault` branch with a `default` profile. Every update
adds a commit to that branch. Your current checkout, application branch, and index
are left alone. There is no need to switch to the vault branch.

`save` keeps the original plaintext file. **You are responsible for excluding
plaintext from Git**, for example with your own `.gitignore`. git-vault does not
inspect or modify ignore settings.

To restore a file that is missing:

```sh
git vault restore -i "$HOME/.config/age/key.txt" .env
```

Use `-f` to overwrite an existing file:

```sh
git vault restore -f -i "$HOME/.config/age/key.txt" .env
```

## Profiles

Profiles group files and recipients in the same vault branch:

```sh
git vault profiles add production -r age1...
git vault save -p production .env
git vault list -p production
git vault profiles list
git vault restore -p production -f -i /path/to/identity .env
```

The same path can be saved in multiple profiles. Restoring different profiles
writes to the same working-tree path. `default` is selected when `-p` is omitted.

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

`save -a` does not discover new files. Register them with explicit paths first.
If any registered source file is missing, the entire save fails.

## Private key input

When `-i` is supplied, identity files are used and stdin is not read. Repeat `-i`
to use multiple identity files. Otherwise git-vault reads identity contents from
redirected stdin, or prompts without echo when stdin is a terminal.

```sh
git vault restore .env < /path/to/identity
cat /path/to/identity | git vault restore -a
# Without -i or redirected stdin, enter a private key at the hidden prompt.
git vault restore .env
```

Stdin accepts an age identity file, including comments and multiple keys.
Interactive input accepts a single native age private key. Redirected and typed
keys are held in a permission-restricted temporary identity file and cleaned up
when the operation exits normally, fails, or is interrupted with Ctrl-C.

## Recipients

Each profile has its own public recipients:

```sh
git vault recipients list -p production
git vault recipients add -p production -i /path/to/identity -l "deploy bot" age1...
git vault recipients remove -p production age1... < /path/to/identity
```

Optional `-l` / `--label` attaches a non-unique description (owner, purpose, and so
on) when adding recipients via `init`, `profiles add`, or `recipients add`. Provide
zero labels, or one label per key in the same order. Labels are metadata only;
removal and identity checks use the public key. Labels cannot be changed later
except by removing and re-adding the recipient.

`recipients add` and `recipients remove` do not only edit the public key list.
When the profile has saved files, git-vault must **decrypt every ciphertext with a
private identity, then re-encrypt it for the updated recipient set**, and commit
the new list and ciphertexts together. That is why a private key is required
unless the profile is empty: age ciphertext cannot be rewritten from public keys
alone. If any decryption or encryption fails, the branch is not updated. The last
recipient cannot be removed.

Among CLI commands, only these operations need a private identity:

- `recipients add` / `recipients remove` — decrypt then re-encrypt (when files exist)
- `restore` — decrypt into the working tree

`save`, `init`, `profiles add`, and similar commands use public recipients only.

### Recommended practice: a master key

Include one privileged public recipient in **every** profile (for example at
`init` and each `profiles add`), and keep that identity available for
`recipients add` / `remove` and emergency restore across profiles.

Treat that identity as high privilege: it can decrypt the current snapshot of every
profile where it is listed. Store it offline or with strict access control, prefer
a clear `-l` label such as `master`, and avoid using it as the day-to-day key for
routine restore when a narrower key is enough. Removing it from a profile still
leaves historical commits decryptable by anyone who held it, as with any recipient
removal.

The initial version supports native age recipients (`age1...`), not SSH recipients
or plugins. Removing a recipient does not revoke access to historical ciphertext.

## Commit messages

All operations that create commits accept `-m` or `-F`:

```sh
git vault save -m "Rotate database credentials" .env
git vault save -m "Update secrets" -m "Use the new database" .env
git vault save -F /path/to/message.txt .env
```

Repeat `-m` to separate paragraphs. `-F` reads a UTF-8 file; `-F -` is not supported
because stdin is reserved for private key input. Messages cannot be empty.

When omitted, messages are generated with a `git-vault:` prefix:

```text
git-vault: Save files in profile production

.env
```

Explicit messages are used without a prefix or format marker. Commit messages are
not encrypted; do not put secrets in them. Git's usual author configuration is
used. Set `user.name` and `user.email` if necessary.

## Working branches and pull requests

`-b` always names the local branch to operate on. It must already exist unless
`-n` explicitly requests a new branch. This prevents a typo from creating a branch.

```sh
git fetch origin

# Create a working branch from the fetched vault branch and save a change.
git vault save -p production -b vault-update-db -n -B origin/vault .env

# Add another commit to the existing working branch.
git vault save -p production -b vault-update-db credentials.json

git push origin vault-update-db
```

Create a pull request from `vault-update-db` to `vault` using your hosting service.
If `-B` is omitted, new branches start from the local `vault` branch. `-n` requires
an explicit `-b`, and fails if that branch already exists. `-B` requires `-n`.

Working branches are also available for `remove`, `profiles add/remove`, and
`recipients add/remove`. Creation is committed only after the operation succeeds.
A vault branch checked out in any worktree cannot be updated by git-vault.

Git cannot have both `vault` and `vault/update-db` branches. Use names such as
`vault-update-db` for working branches.

## Cloning and synchronization

Remote operations use ordinary Git commands; git-vault never fetches or pushes.
After cloning the application branch, create a local vault branch from the remote:

```sh
git fetch origin
git branch --track vault origin/vault
git vault restore -a < /path/to/identity
```

This does not change your checkout. Skip the branch creation if local `vault`
already exists. To fast-forward an existing local vault branch from the remote:

```sh
git fetch origin vault:vault
```

A plain `git fetch origin` normally updates `origin/vault`, not local `vault`.
If your local and remote vault branches diverge, retain the plaintext changes you
need and reapply them on a new branch from the latest `origin/vault`. The tool does
not merge ciphertext or force-push.

For pull requests, reapply changes if recipients in the same profile changed since
the working branch was created. Git may merge a recipients change and a different
file change without a text conflict, even though the resulting ciphertext does
not match the recipients. Process those changes against the latest vault state.
Merge and squash commit messages need no special prefix or trailer.

## Command reference

Options follow the operation: `git vault save -p production .env`, or
`git vault recipients add -p production age1...`.

Paths are relative to the current directory; `-a` uses stored repository-relative
paths. Use `--` before file names beginning with `-`. Force does not bypass symlink,
path, or concurrent-update checks. Commit messages are public; never include
secrets. When `-m` and `-F` are omitted, a message with a `git-vault:` prefix is
generated.

### `init`

```sh
git vault init [options] -r KEY [-r KEY ...] [-l TEXT ...]
```

Initialize an independent vault branch with a `default` profile. The branch must not already exist. This command creates the branch itself and does not accept `-n` or `-B`.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-r`, `--recipient KEY` | Required native age public recipient; repeat for multiple recipients. |
| `-l`, `--label TEXT` | Optional recipient label; repeat once per `-r` in the same order, or omit. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Mutually exclusive with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Mutually exclusive with `-m`. |
| `-h`, `--help` | Show help. |

### `profiles list`

```sh
git vault profiles list [options]
```

List all profiles in the selected branch.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-h`, `--help` | Show help. |

### `profiles add`

```sh
git vault profiles add [options] NAME -r KEY [-r KEY ...] [-l TEXT ...]
```

Create the profile named `NAME` with its own recipients and no files. The profile must not already exist. Profile names begin with an ASCII letter or digit and contain only letters, digits, `.`, `_`, and `-`.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-r`, `--recipient KEY` | Required native age public recipient; repeat for multiple recipients. |
| `-l`, `--label TEXT` | Optional recipient label; repeat once per `-r` in the same order, or omit. |
| `-n`, `--new-branch` | Create the explicitly named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Mutually exclusive with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Mutually exclusive with `-m`. |
| `-h`, `--help` | Show help. |

### `profiles remove`

```sh
git vault profiles remove [options] NAME
```

Remove the profile named `NAME`. It must be empty and cannot be `default`.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-n`, `--new-branch` | Create the explicitly named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Mutually exclusive with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Mutually exclusive with `-m`. |
| `-h`, `--help` | Show help. |

### `recipients list`

```sh
git vault recipients list [options]
```

List public recipients for the selected profile. Each line is `KEY` or `KEY LABEL`, matching the stored recipients file.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-p`, `--profile NAME` | Target profile (default: `default`). |
| `-h`, `--help` | Show help. |

### `recipients add`

```sh
git vault recipients add [options] [-l TEXT ...] KEY...
```

Add the public recipients specified by `KEY...`. When the profile has files, decrypt each ciphertext and re-encrypt it for the updated recipient set in one commit. Existing recipients are rejected. A private identity is needed for that decrypt step unless the profile is empty.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-p`, `--profile NAME` | Target profile (default: `default`). |
| `-i`, `--identity PATH` | Private identity used to decrypt existing files before re-encryption; repeat for multiple files. If omitted, read stdin or prompt without echo. Not needed when the profile has no files. |
| `-l`, `--label TEXT` | Optional recipient label; repeat once per `KEY` in the same order, or omit. |
| `-n`, `--new-branch` | Create the explicitly named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Mutually exclusive with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Mutually exclusive with `-m`. |
| `-h`, `--help` | Show help. |

### `recipients remove`

```sh
git vault recipients remove [options] KEY...
```

Remove the public recipients specified by `KEY...`. When the profile has files, decrypt each ciphertext and re-encrypt it for the remaining recipients in one commit. Unknown recipients and removal of the last recipient are rejected. A private identity is needed for that decrypt step unless the profile is empty. Past commits are unchanged.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-p`, `--profile NAME` | Target profile (default: `default`). |
| `-i`, `--identity PATH` | Private identity used to decrypt existing files before re-encryption; repeat for multiple files. If omitted, read stdin or prompt without echo. Not needed when the profile has no files. |
| `-n`, `--new-branch` | Create the explicitly named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Mutually exclusive with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Mutually exclusive with `-m`. |
| `-h`, `--help` | Show help. |

### `save`

```sh
git vault save [options] PATH...
git vault save [options] -a
```

Encrypt files and append a commit to the selected branch. Unspecified files are retained. Source plaintext is not deleted. Without `-f`, tracked input files are rejected.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-p`, `--profile NAME` | Target profile (default: `default`). |
| `-a`, `--all` | Re-save all registered paths in the profile; mutually exclusive with explicit paths. Does not discover new files. |
| `-f`, `--force` | Allow tracked input files. Read working-tree content, not the staged version; leave the index and application history unchanged. |
| `-n`, `--new-branch` | Create the explicitly named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Mutually exclusive with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Mutually exclusive with `-m`. |
| `-h`, `--help` | Show help. |

### `list`

```sh
git vault list [options]
```

List the original repository-relative paths saved in the selected profile.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-p`, `--profile NAME` | Target profile (default: `default`). |
| `-h`, `--help` | Show help. |

### `restore`

```sh
git vault restore [options] PATH...
git vault restore [options] -a
```

Decrypt files into the working tree. Without `-f`, existing files and tracked paths are rejected. Restored files have mode `0600`. This command does not create a commit or update the vault branch.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-p`, `--profile NAME` | Target profile (default: `default`). |
| `-i`, `--identity PATH` | Private identity file; repeat for multiple files. If omitted, read stdin or prompt without echo. |
| `-a`, `--all` | Restore all saved paths in the selected profile and revision; mutually exclusive with explicit paths. |
| `-f`, `--force` | Overwrite existing or tracked files, including uncommitted working-tree changes; leave the index unchanged. |
| `-R`, `--revision REV` | Restore from a commit reachable from the target branch (default: branch tip). |
| `-h`, `--help` | Show help. |

### `remove`

```sh
git vault remove [options] PATH...
```

Remove the specified paths from the current saved snapshot in one commit. Keep working-tree plaintext and historical commits. All specified paths must be saved in the selected profile.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-p`, `--profile NAME` | Target profile (default: `default`). |
| `-n`, `--new-branch` | Create the explicitly named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Mutually exclusive with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Mutually exclusive with `-m`. |
| `-h`, `--help` | Show help. |

### `version`

```sh
git vault version
```

Print the version hardcoded in the script, such as `0.6.0`. No repository or age
installation is required.

| Option | Purpose |
| --- | --- |
| `-h`, `--help` | Show help. |

### `skill`

```sh
git vault skill
git vault skill -o
git vault skill -o .claude/skills/git-vault/SKILL.md
```

Print a self-contained agent skill as SKILL.md content to stdout. The skill explains
how an AI agent should use git-vault's profiles, recipients, restore operations,
and working branches. No repository or age installation is required to generate it.

Use `-o` without a path to install it at `.agents/skills/git-vault/SKILL.md`, or
provide a full file path to use another location, such as `.claude/skills/git-vault/SKILL.md`.
Relative paths start from the current directory. Missing parent directories are
created. File mode writes the skill to the file and a confirmation to stderr,
leaving stdout empty. Existing files are preserved unless `-f` is specified;
symlink output files are rejected even with `-f`.

| Option | Purpose |
| --- | --- |
| `-o`, `--output [PATH]` | Write the skill to a file; an omitted path defaults to `.agents/skills/git-vault/SKILL.md`. Without this option, print to stdout. |
| `-f`, `--force` | Overwrite an existing output file; requires `-o`. |
| `-h`, `--help` | Show help. |

### Exit codes

`0` success, `1` operation failure, `2` invalid arguments, `3` ref update or creation
conflict.

## Storage and scope

Each profile occupies a directory at the root of the vault branch:

```text
default/
  recipients
  files/
    .env
production/
  recipients
  files/
    .env
```

Every file under `files/` is binary age ciphertext, regardless of its name. Original
relative paths are preserved without extra extensions. Recipients are public, one
per line as `KEY` or `KEY LABEL` (first space separates an optional label). File
names, sizes, profile names, labels, and Git metadata remain visible.

This layout and the `profiles` / `--profile` CLI replace the previous section
format and commands. Old layouts and options are not supported; no migration is
performed.

The tool is intended for small files in application repositories. It does
not provide secure deletion, key storage, access revocation for old commits, or
automatic conflict resolution. Removing a saved file leaves its history intact.
Only regular files inside the working tree are supported; directories, symlinks,
Git administration paths, and Windows are outside the initial scope. Original
ownership, timestamps, and executable permissions are not preserved. Restored files
have mode `0600`, and newly created directories have mode `0700`.

## Tests

```sh
./tests/run.sh
```

Each script in `tests/cases/` exercises one scenario by running `git vault` and
ordinary Git/age commands directly. To run just one scenario:

```sh
bash tests/cases/03-recipients.sh
```

`tests/common.sh` contains temporary-repository setup and small assertions. Each
scenario creates disposable keys and repositories, isolates personal Git
configuration, and cleans up afterward. Tests cover round trips, profiles,
recipient rotation and labels, working branches, messages, force handling, paths,
historical restore, linked worktrees, remote divergence, failure atomicity, and
agent skill output and installation.

There is no test framework or Python package dependency. Bash, Git, age, age-keygen,
and Python (for git-vault itself) are required. A small Python helper drives the
real CLI through a terminal for the interactive-input test. If PTY allocation is
unavailable, that check is explicitly reported as skipped. Tests never import
git-vault's implementation.

## Author

Kohki Makimoto <kohki.makimoto@gmail.com>

## License

The MIT License (MIT)
