---
title: profile remove
description: 空でdefault以外のプロファイルを削除する。
section: reference
order: 5
---

```sh
git vault profile remove [options] NAME
```

`NAME`というプロファイルを削除します。空である必要があり、`default`は削除できません。

| オプション | 説明 |
| --- | --- |
| `-b`, `--branch NAME` | 使用するローカルブランチ（デフォルト: `vault`）。 |
| `-n`, `--new-branch` | 指定した`-b`ブランチを作成する。既にある場合は失敗する。 |
| `-B`, `--base REF` | 作成時のベース（デフォルト: `vault`）。`-n`が必要。 |
| `-m` / `-F` | コミットメッセージ（[概要](/ja/docs/reference/overview)を参照）。 |
| `-h`, `--help` | ヘルプを表示する。 |
