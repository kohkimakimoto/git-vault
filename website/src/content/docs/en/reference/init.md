---
title: init
description: Create the orphan vault branch and default profile.
section: reference
order: 2
---

```sh
git vault init [options] (-r KEY | -R PATH) [-l TEXT]...
```

Create a local orphan vault branch (default name `vault`) with a `default` profile and a root `README.md` describing the branch. The branch must not already exist. Recipients are required via `-r` or `-R`.

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local branch to create (default: `vault`). |
| `-r`, `--recipient KEY` | Public key (not with `-R`). |
| `-R`, `--recipients-file PATH` | Recipients file; `-` for stdin (not with `-r`). |
| `-l`, `--label TEXT` | Optional label; omit, or one per key (`-r`) / per `-R` key line. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs (not with `-F`). |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file (not with `-m`). |
| `-h`, `--help` | Show help. |
