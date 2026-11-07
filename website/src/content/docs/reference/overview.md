---
title: Overview
description: Conventions shared by every git vault command.
section: reference
order: 1
---

Options follow the operation: `git vault save -p production .env`, or `git vault recipient add -p production -r age...`.

Paths are relative to the current directory; `-a` uses stored repository-relative paths. Use `--` before file names beginning with `-`. When `-m` and `-F` are omitted, a message with a `git-vault:` prefix is generated.

## Common options

Many mutating commands accept:

| Option | Purpose |
| --- | --- |
| `-b`, `--branch NAME` | Local vault branch (default: `vault`). |
| `-p`, `--profile NAME` | Profile (default: `default`). |
| `-n`, `--new-branch` | Create the named `-b` branch; fail if it already exists. |
| `-B`, `--base REF` | Creation base (default: `vault`); requires `-n`. |
| `-m`, `--message TEXT` | Commit message; repeat for paragraphs (not with `-F`). |
| `-F`, `--message-file PATH` | Read a UTF-8 commit message file (not with `-m`). |
| `-h`, `--help` | Show help. |
