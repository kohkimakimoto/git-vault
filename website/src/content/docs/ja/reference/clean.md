---
title: clean
description: 保存済みパスの作業ツリー上の平文を削除する。
section: reference
order: 14
---

```sh
git vault clean [options] PATH...
git vault clean [options] -a
```

保存済みパスの作業ツリー上の平文を削除します。`-f`なしでは、先にvault tipと比較し、内容が異なる場合は削除を拒否します。`-f`ありでは無条件に削除します。

| オプション | 説明 |
| --- | --- |
| `-b`, `--branch NAME` | 使用するローカルブランチ（デフォルト: `vault`）。 |
| `-p`, `--profile NAME` | プロファイル（デフォルト: `default`）。 |
| `-i`, `--identity PATH` | 既定の比較ステップ用identity。`-f`では無視される。 |
| `-a`, `--all` | プロファイルに保存済みのすべてのパスをクリーンする。 |
| `-f`, `--force` | 無条件に削除する。 |
| `-h`, `--help` | ヘルプを表示する。 |
