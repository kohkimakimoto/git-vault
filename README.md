# git-vault

Store age-encrypted files in a Git branch, separate from your application code.

`git vault` is a single Python script for personal projects that need to keep files
such as `.env` in their repository without putting encrypted files or configuration
on the application branch. It uses [age](https://github.com/FiloSottile/age) for
cryptography and Git for storage. No Python packages or secret-management service
are required.

## Requirements

- Python 3.11 or later
- Git
- age (`age-keygen` is useful for generating keys and required by the tests)
- macOS or Linux

## Installation

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

`init` creates an independent `vault` branch with a `default` section. Every update
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

## Sections

Sections group files and recipients in the same vault branch:

```sh
git vault sections add production -r age1...
git vault save -s production .env
git vault list -s production
git vault sections list
git vault restore -s production -f -i /path/to/identity .env
```

The same path can be saved in multiple sections. Restoring different sections
writes to the same working-tree path. `default` is selected when `-s` is omitted.

```sh
# Re-save every path already registered in this section.
git vault save -s production -a

# Restore every file in this section.
git vault restore -s production -a -f -i /path/to/identity

# Remove a saved file, keeping its plaintext and past commits.
git vault remove -s production .env

# Only empty, non-default sections can be removed.
git vault sections remove production
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

Each section has its own public recipients:

```sh
git vault recipients list -s production
git vault recipients add -s production -i /path/to/identity age1...
git vault recipients remove -s production age1... < /path/to/identity
```

Adding or removing recipients re-encrypts **every file in that section** and commits
the new recipients and ciphertexts together. You must be able to decrypt all of
those files. If any decryption or encryption fails, the branch is not updated.
Empty sections do not require a private key. The last recipient cannot be removed.

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
git-vault: Save files in section production

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
git vault save -s production -b vault-update-db -n -B origin/vault .env

# Add another commit to the existing working branch.
git vault save -s production -b vault-update-db credentials.json

git push origin vault-update-db
```

Create a pull request from `vault-update-db` to `vault` using your hosting service.
If `-B` is omitted, new branches start from the local `vault` branch. `-n` requires
an explicit `-b`, and fails if that branch already exists. `-B` requires `-n`.

Working branches are also available for `remove`, `sections add/remove`, and
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

For pull requests, reapply changes if recipients in the same section changed since
the working branch was created. Git may merge a recipients change and a different
file change without a text conflict, even though the resulting ciphertext does
not match the recipients. Process those changes against the latest vault state.
Merge and squash commit messages need no special prefix or trailer.

## Command reference

Options follow the operation: `git vault save -s production .env`, or
`git vault recipients add -s production age1...`.

| Command | Purpose |
| --- | --- |
| `init -r KEY` | Initialize an independent vault branch and default section |
| `sections list` | List sections |
| `sections add NAME -r KEY` | Add a section |
| `sections remove NAME` | Remove an empty, non-default section |
| `recipients list` | List a section's public recipients |
| `recipients add KEY...` | Add recipients and re-encrypt the section |
| `recipients remove KEY...` | Remove recipients and re-encrypt the section |
| `save PATH...` | Encrypt and commit files |
| `list` | List saved paths |
| `restore PATH...` | Decrypt files into the working tree |
| `remove PATH...` | Remove files from the current saved snapshot |

| Option | Purpose |
| --- | --- |
| `-h`, `--help` | Show help |
| `-b`, `--branch NAME` | Target local branch (default: `vault`) |
| `-s`, `--section NAME` | Target section (default: `default`) |
| `-n`, `--new-branch` | Create the explicitly named target branch |
| `-B`, `--base REF` | Creation base (default: `vault`) |
| `-r`, `--recipient KEY` | Initial public recipient; repeat as needed |
| `-i`, `--identity PATH` | Private identity file; repeat as needed |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs |
| `-F`, `--message-file PATH` | UTF-8 commit message file |
| `-a`, `--all` | All saved paths in the section, for save/restore |
| `-f`, `--force` | Allow tracked input for save; overwrite existing/tracked files for restore |
| `-R`, `--revision REV` | Restore from a commit reachable from the target branch |
| `-C`, `--no-color` | Disable ANSI colors (current output is plain text) |

Each operation accepts only its applicable options. Use `git vault <operation> -h`
for details. Paths are relative to the current directory; `-a` uses stored
repository-relative paths. Use `--` before names beginning with `-`.

`save` and `restore` reject tracked paths unless `-f` is explicit. `save -f` reads
the working-tree content, not the staged version. `restore -f` can overwrite
uncommitted working-tree changes. Neither changes the index or application history.
`-f` does not bypass symlink, path, or concurrent-update checks.

Exit codes: `0` success, `1` operation failure, `2` invalid arguments, `3` ref update
or creation conflict.

## Storage and scope

```text
sections/
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
relative paths are preserved without extra extensions. Recipients are public,
one per line. File names, sizes, section names, and Git metadata remain visible.

The tool is intended for small files in personal application repositories. It does
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
configuration, and cleans up afterward. Tests cover round trips, sections,
recipient rotation, working branches, messages, force handling, paths, historical
restore, linked worktrees, remote divergence, and failure atomicity.

There is no test framework or Python package dependency. Bash, Git, age, age-keygen,
and Python (for git-vault itself) are required. A small Python helper drives the
real CLI through a terminal for the interactive-input test. If PTY allocation is
unavailable, that check is explicitly reported as skipped. Tests never import
git-vault's implementation.
