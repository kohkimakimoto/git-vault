---
title: save
description: ファイルを暗号化してvaultブランチにコミットする。
section: reference
order: 9
---

```sh
git vault save [options] PATH...
git vault save [options] -a
```

ファイルを暗号化し、選択したブランチにコミットを追加します。元の平文はそのまま残ります。`-f`なしでは、追跡済みの入力ファイルは拒否されます。

| オプション | 説明 |
| --- | --- |
| `-b`, `--branch NAME` | 使用するローカルブランチ（デフォルト: `vault`）。 |
| `-p`, `--profile NAME` | プロファイル（デフォルト: `default`）。 |
| `-a`, `--all` | プロファイルに登録済みのすべてのパスを再保存する。 |
| `-f`, `--force` | 追跡済みの入力ファイルを許可する。 |
| `-n` / `-B` / `-m` / `-F` | ブランチ作成とコミットメッセージ（[概要](/ja/docs/reference/overview)を参照）。 |
| `-h`, `--help` | ヘルプを表示する。 |
