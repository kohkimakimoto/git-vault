---
title: Clone and sync
description: Join an existing vault and keep your local vault branch up to date.
section: guide
order: 7
---

Use this guide when a `vault` branch already exists on `origin`. To create a new vault, follow [Quick start](/docs/guide/quick-start).

Install [git-vault](/docs/guide/installation), check its [requirements](/docs/guide/introduction#requirements), and clone the application repository. Run the commands below from its root. Stay on your application branch; you do not need to check out `vault`.

## Prepare a decryption identity

On each new machine or clone, follow [Private keys](/docs/guide/private-keys) to create an identity and configure `vault.identity`. Ask a repository administrator to add its public key as a [recipient](/docs/guide/recipients) in the profile you need, and push the updated vault branch before you fetch it.

Creating a new identity alone does not grant access to existing ciphertext. Its public key must be registered in the profile. Keep the private identity file and passphrase local.

## Restore from an existing vault

After cloning the application repository, create a local branch that tracks the remote vault:

```sh
git fetch origin vault
git branch --track vault origin/vault
git vault restore .env
```

This example assumes `.env` is saved in the `default` profile and does not exist in your working tree. Use `-p NAME` for another profile or `-a` to restore every saved file. See [restore](/docs/reference/restore) for overwrite options.

If the local `vault` branch already exists, use [Sync an existing local vault](#sync-an-existing-local-vault) below before restoring instead of running `git branch --track`. Fetching updates `origin/vault`; git-vault reads the local `vault` branch.

## Sync an existing local vault

Fast-forward the local vault branch without checking it out:

```sh
git fetch origin vault:vault
```

This updates the local branch only; run `git vault restore` separately when you want to update plaintext files.

If local and remote vault branches have diverged, Git rejects this update. Keep the plaintext changes you need and reapply them on a [new working branch](/docs/guide/working-branches) from the latest `origin/vault`.
