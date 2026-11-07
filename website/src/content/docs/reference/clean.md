---
title: clean
description: Delete working-tree plaintext for saved paths.
section: reference
order: 14
---

```sh
git vault clean [options] PATH...
git vault clean [options] -a
```

Delete working-tree plaintext for saved paths. Without `-f`, compare to the vault tip first and refuse to delete when content differs. With `-f`, delete unconditionally.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-i`, `--identity PATH` | Identity for the default compare step. Ignored with `-f`. |
| `-a`, `--all` | Clean all saved paths in the profile. |
| `-f`, `--force` | Delete unconditionally. |
| `-h`, `--help` | Show help. |
