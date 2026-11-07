---
title: Quick start
description: Encrypt and restore a .env file in a few steps.
section: guide
order: 3
---

This example encrypts and saves a `.env` file that holds application secrets.

## Before you start

- [Install git-vault](/docs/guide/installation) and check its [requirements](/docs/guide/introduction#requirements).
- Run the commands from the root of your application repository, with an existing `.env` file. Exclude `.env` from Git using `.gitignore` before you begin.
- These steps create a new local `vault` branch and `.git/vaultkey.age`. If you already have a vault, follow [Clone and sync](/docs/guide/clone-and-sync). Do not overwrite an existing identity file.
- The publish command assumes a Git remote named `origin` is configured.

## Set a default identity path

Once, set a user-global default so every repository looks for a per-clone key:

```sh
git config --global vault.identity '$GIT_COMMON_DIR/vaultkey.age'
```

`$GIT_COMMON_DIR` is a git-vault placeholder; it expands to the absolute path from `git rev-parse --git-common-dir`.

## Create an identity

```sh
age-keygen | age -p > .git/vaultkey.age
chmod 600 .git/vaultkey.age
```

`age -p` prompts for a passphrase. Replace `age...` below with the full public key (`age1...`) printed by `age-keygen`.

## Initialize and save

```sh
git vault init -r age...
git vault save .env
git vault list
git push origin vault
```

`init` creates an orphan `vault` branch. `save` keeps the original plaintext file — you are responsible for excluding plaintext from Git (for example with `.gitignore`).

## Restore

`save` leaves `.env` in place. Choose the example that matches your working tree.

To restore a missing, untracked `.env` file:

```sh
git vault restore .env
```

To overwrite an existing `.env`, including immediately after `save`:

```sh
git vault restore -f .env
```

`-f` replaces local changes with the saved version. Without it, `restore` refuses existing files and tracked paths. Both examples use the identity configured above and prompt for its passphrase. See [restore](/docs/reference/restore) for more options.
