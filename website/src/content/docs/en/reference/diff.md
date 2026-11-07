---
title: diff
description: Compare working-tree plaintext to the vault tip.
section: reference
order: 13
---

```sh
git vault diff [options] PATH...
git vault diff [options] -a
```

Compare working-tree plaintext to the latest saved snapshot. Prints a unified diff for each changed path. Exit status is `1` when any selected path differs. Diffs contain secrets.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-i`, `--identity PATH` | Identity file. Use `-i -` for stdin, or `vault.identity`. |
| `-a`, `--all` | Diff all saved paths in the profile. |
| `-h`, `--help` | Show help. |
