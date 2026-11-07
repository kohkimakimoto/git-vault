---
title: Private keys
description: How git-vault finds an age identity for decrypt and re-encrypt.
section: guide
order: 6
---

An identity (private key) is required when decrypting: `restore`, `diff`, default `clean` (not `clean -f`), or `recipient add` / `remove` when the profile has files. Resolve it as follows:

1. `-i` / `--identity PATH`. Use `-i -` to read an identity from stdin. Overrides `vault.identity`.
2. Otherwise `git config vault.identity` (see below).

```sh
# Restore with an explicit identity file
git vault restore -i /path/to/identity .env

# Read the identity from stdin via redirection
git vault restore -i - .env < /path/to/identity

# Same via a pipe; -a restores every saved path in the profile
cat /path/to/identity | git vault restore -a -i -

# User-global default with a per-clone path
git config --global vault.identity '$GIT_COMMON_DIR/vaultkey.age'

# Restore using vault.identity
git vault restore .env
```

`-i -` is read once per operation into a temporary file and reused for every decrypt in that operation.

## `vault.identity`

Set a default identity file path with `git config`. The value may contain `$GIT_COMMON_DIR` or `$TOPLEVEL` (also `${…}`), which git-vault expands when it reads the config.

| Placeholder | Expands to (same idea as `git rev-parse`) |
|---|---|
| `$GIT_COMMON_DIR` | `--git-common-dir` (absolute) |
| `$TOPLEVEL` | `--show-toplevel` (absolute) |

These are git-vault placeholders in the config value, not shell or environment variables. Unknown `$NAME` / `${NAME}` forms are rejected. Prefer a **user-global** setting with `$GIT_COMMON_DIR` so each clone keeps its own key under `.git/`.

```sh
# Once per user machine (quote so the shell leaves $… alone)
git config --global vault.identity '$GIT_COMMON_DIR/vaultkey.age'
```

This writes into `~/.gitconfig`, for example:

```ini
[vault]
	identity = $GIT_COMMON_DIR/vaultkey.age
```

## Recommended practice

Create a passphrase-protected identity per clone under the local Git directory:

```sh
age-keygen | age -p > .git/vaultkey.age
chmod 600 .git/vaultkey.age
```

Give only the public key (`Public key: age...`) to the repository administrator so they can register it as a [recipient](/docs/guide/recipients). Do not share the identity file or passphrase.
