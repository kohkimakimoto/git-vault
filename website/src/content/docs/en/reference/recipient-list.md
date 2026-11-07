---
title: recipient list
description: List recipients for a profile.
section: reference
order: 6
---

```sh
git vault recipient list [options]
```

List recipients for the selected profile. Default lines are `KEY` or `KEY  LABEL`. `--json` prints the canonical stored JSON.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `--json` | Print recipients as canonical JSON. |
| `-h`, `--help` | Show help. |
