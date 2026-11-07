---
title: restore
description: Decrypt vault files into the working tree.
section: reference
order: 11
---

```sh
git vault restore [options] PATH...
git vault restore [options] -a
```

Decrypt files into the working tree. Without `-f`, existing files and tracked paths are rejected. Restored files have mode `0600`.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-i`, `--identity PATH` | Identity file. Use `-i -` for stdin, or omit and use `vault.identity`. |
| `-a`, `--all` | Restore all saved paths in the profile. |
| `-f`, `--force` | Overwrite existing or tracked files. |
| `--revision REV` | Restore from a commit reachable from the branch (default: tip). |
| `-h`, `--help` | Show help. |
