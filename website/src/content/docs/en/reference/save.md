---
title: save
description: Encrypt files and commit them to the vault branch.
section: reference
order: 9
---

```sh
git vault save [options] PATH...
git vault save [options] -a
```

Encrypt files and append a commit to the selected branch. Source plaintext remains. Without `-f`, tracked input files are rejected.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-a`, `--all` | Re-save all registered paths in the profile. |
| `-f`, `--force` | Allow tracked input files. |
| `-n` / `-B` / `-m` / `-F` | Branch creation and commit message (see [Overview](/docs/reference/overview)). |
| `-h`, `--help` | Show help. |
