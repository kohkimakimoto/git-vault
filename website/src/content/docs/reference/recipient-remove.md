---
title: recipient remove
description: Remove age public keys from a profile.
section: reference
order: 8
---

```sh
git vault recipient remove [options] (-r KEY | -R PATH)
```

Remove public keys from `-r` / `-R`. When the profile has files, decrypt and re-encrypt for the remaining keys in one commit. The last public key cannot be removed.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-r` / `-R` | Public key(s) to remove. |
| `-i`, `--identity PATH` | Identity for re-encryption when the profile has files. |
| `-n` / `-B` / `-m` / `-F` | Branch creation and commit message (see [Overview](/docs/reference/overview)). |
| `-h`, `--help` | Show help. |
