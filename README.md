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

Paths are relative to the current directory; `-a` uses stored repository-relative
paths. Use `--` before file names beginning with `-`. Force does not bypass symlink,
path, or concurrent-update checks. Commit messages are public; never include
secrets. When `-m` and `-F` are omitted, a message with a `git-vault:` prefix is
generated.

### `init`

```sh
git vault init [options] -r KEY [-r KEY ...]
```

Initialize an independent vault branch with a `default` section. The branch must not already exist. This command creates the branch itself and does not accept `-n` or `-B`.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-r`, `--recipient KEY` | Required native age public recipient; repeat for multiple recipients. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Mutually exclusive with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Mutually exclusive with `-m`. |
| `-C`, `--no-color` | Disable ANSI colors. Current output is plain text. |
| `-h`, `--help` | Show help. |

### `sections list`

```sh
git vault sections list [options]
```

List all sections in the selected branch.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-C`, `--no-color` | Disable ANSI colors. Current output is plain text. |
| `-h`, `--help` | Show help. |

### `sections add`

```sh
git vault sections add [options] NAME -r KEY [-r KEY ...]
```

Create the section named `NAME` with its own recipients and no files. The section must not already exist. Section names begin with an ASCII letter or digit and contain only letters, digits, `.`, `_`, and `-`.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-r`, `--recipient KEY` | Required native age public recipient; repeat for multiple recipients. |
| `-n`, `--new-branch` | Create the explicitly named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Mutually exclusive with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Mutually exclusive with `-m`. |
| `-C`, `--no-color` | Disable ANSI colors. Current output is plain text. |
| `-h`, `--help` | Show help. |

### `sections remove`

```sh
git vault sections remove [options] NAME
```

Remove the section named `NAME`. It must be empty and cannot be `default`.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-n`, `--new-branch` | Create the explicitly named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Mutually exclusive with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Mutually exclusive with `-m`. |
| `-C`, `--no-color` | Disable ANSI colors. Current output is plain text. |
| `-h`, `--help` | Show help. |

### `recipients list`

```sh
git vault recipients list [options]
```

List public recipients for the selected section.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-s`, `--section NAME` | Target section (default: `default`). |
| `-C`, `--no-color` | Disable ANSI colors. Current output is plain text. |
| `-h`, `--help` | Show help. |

### `recipients add`

```sh
git vault recipients add [options] KEY...
```

Add the public recipients specified by `KEY...` and re-encrypt every saved file in the section in one commit. Existing recipients are rejected. A private identity is needed unless the section is empty.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-s`, `--section NAME` | Target section (default: `default`). |
| `-i`, `--identity PATH` | Private identity file; repeat for multiple files. If omitted, read stdin or prompt without echo. |
| `-n`, `--new-branch` | Create the explicitly named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Mutually exclusive with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Mutually exclusive with `-m`. |
| `-C`, `--no-color` | Disable ANSI colors. Current output is plain text. |
| `-h`, `--help` | Show help. |

### `recipients remove`

```sh
git vault recipients remove [options] KEY...
```

Remove the public recipients specified by `KEY...` and re-encrypt every saved file in the section in one commit. Unknown recipients and removal of the last recipient are rejected. A private identity is needed unless the section is empty. Past commits are unchanged.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-s`, `--section NAME` | Target section (default: `default`). |
| `-i`, `--identity PATH` | Private identity file; repeat for multiple files. If omitted, read stdin or prompt without echo. |
| `-n`, `--new-branch` | Create the explicitly named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Mutually exclusive with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Mutually exclusive with `-m`. |
| `-C`, `--no-color` | Disable ANSI colors. Current output is plain text. |
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
| `-s`, `--section NAME` | Target section (default: `default`). |
| `-a`, `--all` | Re-save all registered paths in the section; mutually exclusive with explicit paths. Does not discover new files. |
| `-f`, `--force` | Allow tracked input files. Read working-tree content, not the staged version; leave the index and application history unchanged. |
| `-n`, `--new-branch` | Create the explicitly named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Mutually exclusive with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Mutually exclusive with `-m`. |
| `-C`, `--no-color` | Disable ANSI colors. Current output is plain text. |
| `-h`, `--help` | Show help. |

### `list`

```sh
git vault list [options]
```

List the original repository-relative paths saved in the selected section.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-s`, `--section NAME` | Target section (default: `default`). |
| `-C`, `--no-color` | Disable ANSI colors. Current output is plain text. |
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
| `-s`, `--section NAME` | Target section (default: `default`). |
| `-i`, `--identity PATH` | Private identity file; repeat for multiple files. If omitted, read stdin or prompt without echo. |
| `-a`, `--all` | Restore all saved paths in the selected section and revision; mutually exclusive with explicit paths. |
| `-f`, `--force` | Overwrite existing or tracked files, including uncommitted working-tree changes; leave the index unchanged. |
| `-R`, `--revision REV` | Restore from a commit reachable from the target branch (default: branch tip). |
| `-C`, `--no-color` | Disable ANSI colors. Current output is plain text. |
| `-h`, `--help` | Show help. |

### `remove`

```sh
git vault remove [options] PATH...
```

Remove the specified paths from the current saved snapshot in one commit. Keep working-tree plaintext and historical commits. All specified paths must be saved in the selected section.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Target local branch (default: `vault`). Must exist unless explicitly created. |
| `-s`, `--section NAME` | Target section (default: `default`). |
| `-n`, `--new-branch` | Create the explicitly named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs. Mutually exclusive with `-F`. |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file, not stdin. Mutually exclusive with `-m`. |
| `-C`, `--no-color` | Disable ANSI colors. Current output is plain text. |
| `-h`, `--help` | Show help. |

### `version`

```sh
git vault version
```

Print the version hardcoded in the script, such as `0.3.0`. No repository or age
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
how an AI agent should use git-vault's sections, recipients, restore operations,
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
configuration, and cleans up afterward. Tests cover round trips, sections,
recipient rotation, working branches, messages, force handling, paths, historical
restore, linked worktrees, remote divergence, failure atomicity, and agent skill
output and installation.

There is no test framework or Python package dependency. Bash, Git, age, age-keygen,
and Python (for git-vault itself) are required. A small Python helper drives the
real CLI through a terminal for the interactive-input test. If PTY allocation is
unavailable, that check is explicitly reported as skipped. Tests never import
git-vault's implementation.

## Author

Kohki Makimoto <kohki.makimoto@gmail.com>

## License

The MIT License (MIT)
