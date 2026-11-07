---
title: diff
description: 作業ツリーの平文とvault tipを比較する。
section: reference
order: 13
---

```sh
git vault diff [options] PATH...
git vault diff [options] -a
```

作業ツリーの平文と最新の保存済みスナップショットを比較します。変更がある各パスについてunified diffを出力します。選択したパスのいずれかが異なる場合、終了ステータスは`1`です。diffにはシークレットが含まれます。

| オプション | 説明 |
| --- | --- |
| `-b`, `--branch NAME` | 使用するローカルブランチ（デフォルト: `vault`）。 |
| `-p`, `--profile NAME` | プロファイル（デフォルト: `default`）。 |
| `-i`, `--identity PATH` | identityファイル。`-i -`で標準入力、または`vault.identity`。 |
| `-a`, `--all` | プロファイルに保存済みのすべてのパスをdiffする。 |
| `-h`, `--help` | ヘルプを表示する。 |
