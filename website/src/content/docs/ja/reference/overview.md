---
title: 概要
description: すべてのgit vaultコマンドに共通する規約。
section: reference
order: 1
---

オプションは操作のあとに置きます。例: `git vault save -p production .env`、`git vault recipient add -p production -r age...`。

パスはカレントディレクトリからの相対パスです。`-a`は保存済みのリポジトリ相対パスを使います。`-`で始まるファイル名の前には`--`を付けてください。`-m`と`-F`を省略すると、`git-vault:`プレフィックス付きのメッセージが生成されます。

<h2 id="common-options">共通オプション</h2>

多くの変更系コマンドは次を受け付けます。

| オプション | 説明 |
| --- | --- |
| `-b`, `--branch NAME` | ローカルのvaultブランチ（デフォルト: `vault`）。 |
| `-p`, `--profile NAME` | プロファイル（デフォルト: `default`）。 |
| `-n`, `--new-branch` | 指定した`-b`ブランチを作成する。既にある場合は失敗する。 |
| `-B`, `--base REF` | 作成時のベース（デフォルト: `vault`）。`-n`が必要。 |
| `-m`, `--message TEXT` | コミットメッセージ。段落ごとに繰り返し指定できる（`-F`と併用不可）。 |
| `-F`, `--message-file PATH` | UTF-8のコミットメッセージファイルを読む（`-m`と併用不可）。 |
| `-h`, `--help` | ヘルプを表示する。 |
