---
title: profile remove
description: Remove an empty non-default profile.
section: reference
order: 5
---

```sh
git vault profile remove [options] NAME
```

Remove the profile named `NAME`. It must be empty and cannot be `default`.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-n`, `--new-branch` | Create the named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m` / `-F` | Commit message (see [Overview](/docs/reference/overview)). |
| `-h`, `--help` | Show help. |
