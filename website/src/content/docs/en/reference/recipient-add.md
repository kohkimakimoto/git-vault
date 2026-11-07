---
title: recipient add
description: Add age public keys to a profile.
section: reference
order: 7
---

```sh
git vault recipient add [options] (-r KEY | -R PATH) [-l TEXT]...
```

Add public keys from `-r` / `-R`. When the profile has files, decrypt each ciphertext and re-encrypt it for the updated public keys in one commit. A private identity is required unless the profile is empty.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-r` / `-R` | Public key(s) to add. |
| `-i`, `--identity PATH` | Identity for re-encryption. Use `-i -` for stdin, or `vault.identity`. |
| `-l`, `--label TEXT` | Optional label; omit, or one per key / per `-R` key line. |
| `-n` / `-B` / `-m` / `-F` | Branch creation and commit message (see [Overview](/docs/reference/overview)). |
| `-h`, `--help` | Show help. |
