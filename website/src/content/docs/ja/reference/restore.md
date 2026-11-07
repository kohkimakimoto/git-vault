---
title: restore
description: vaultのファイルを作業ツリーに復号する。
section: reference
order: 11
---

```sh
git vault restore [options] PATH...
git vault restore [options] -a
```

ファイルを作業ツリーに復号します。`-f`なしでは、既存ファイルと追跡済みパスは拒否されます。復元されたファイルのモードは`0600`です。

| オプション | 説明 |
| --- | --- |
| `-b`, `--branch NAME` | 使用するローカルブランチ（デフォルト: `vault`）。 |
| `-p`, `--profile NAME` | プロファイル（デフォルト: `default`）。 |
| `-i`, `--identity PATH` | identityファイル。`-i -`で標準入力、省略時は`vault.identity`。 |
| `-a`, `--all` | プロファイルに保存済みのすべてのパスを復元する。 |
| `-f`, `--force` | 既存または追跡済みのファイルを上書きする。 |
| `--revision REV` | ブランチから到達可能なコミットから復元する（デフォルト: tip）。 |
| `-h`, `--help` | ヘルプを表示する。 |
