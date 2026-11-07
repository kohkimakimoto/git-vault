---
title: profile add
description: Create a profile with its own recipients.
section: reference
order: 4
---

```sh
git vault profile add [options] NAME (-r KEY | -R PATH) [-l TEXT]...
```

Create the profile named `NAME` with its own recipients and no files. The profile must not already exist. Profile names begin with an ASCII letter or digit and contain only letters, digits, `.`, `_`, and `-`. Recipients are required via `-r` or `-R`.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to use (default: `vault`). |
| `-r`, `--recipient KEY` | Public key (not with `-R`). |
| `-R`, `--recipients-file PATH` | Recipients file; `-` for stdin (not with `-r`). |
| `-l`, `--label TEXT` | Optional label; omit, or one per key (`-r`) / per `-R` key line. |
| `-n`, `--new-branch` | Create the named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m` / `-F` | Commit message (see [Overview](/docs/reference/overview)). |
| `-h`, `--help` | Show help. |
