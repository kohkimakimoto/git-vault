---
title: Quick start
description: Encrypt and restore a .env file in a few steps.
section: guide
order: 3
---

This example encrypts and saves a `.env` file that holds application secrets.

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

`age -p` prompts for a passphrase. Note the public key printed by `age-keygen`.

## Initialize and save

```sh
git vault init -r age...
git vault save .env
git vault list
git push origin vault
```

`init` creates an orphan `vault` branch. `save` keeps the original plaintext file — you are responsible for excluding plaintext from Git (for example with `.gitignore`).

## Restore

```sh
git vault restore .env
git vault restore -f .env   # overwrite if it already exists
```
