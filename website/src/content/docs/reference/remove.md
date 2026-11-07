---
title: remove
description: Drop paths from the current vault snapshot.
section: reference
order: 12
---

```sh
git vault remove [options] PATH...
```

Remove the specified paths from the current saved snapshot. Working-tree plaintext and older commits stay.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-n` / `-B` / `-m` / `-F` | Branch creation and commit message (see [Overview](/docs/reference/overview)). |
| `-h`, `--help` | Show help. |
