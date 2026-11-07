---
title: Installation
description: Install git-vault with Homebrew or manually.
section: guide
order: 2
---

## Homebrew

```sh
brew install kohkimakimoto/tap/git-vault
```

This also installs [age](https://github.com/FiloSottile/age) as a Homebrew dependency.

## Manual installation

Place `bin/git-vault` somewhere on your `PATH` and make it executable.

git-vault is an external Git subcommand: Git allows an executable named `git-xxx` on your PATH to be invoked as `git xxx`.
