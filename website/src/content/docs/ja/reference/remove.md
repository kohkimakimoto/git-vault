---
title: remove
description: 現在のvaultスナップショットからパスを削除する。
section: reference
order: 12
---

```sh
git vault remove [options] PATH...
```

現在の保存済みスナップショットから指定パスを削除します。作業ツリーの平文と古いコミットはそのまま残ります。

| オプション | 説明 |
| --- | --- |
| `-b`, `--branch NAME` | 使用するローカルブランチ（デフォルト: `vault`）。 |
| `-p`, `--profile NAME` | プロファイル（デフォルト: `default`）。 |
| `-n` / `-B` / `-m` / `-F` | ブランチ作成とコミットメッセージ（[概要](/ja/docs/reference/overview)を参照）。 |
| `-h`, `--help` | ヘルプを表示する。 |
