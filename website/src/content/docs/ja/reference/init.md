---
title: init
description: orphanのvaultブランチとdefaultプロファイルを作成する。
section: reference
order: 2
---

```sh
git vault init [options] (-r KEY | -R PATH) [-l TEXT]...
```

ローカルのorphan vaultブランチ（デフォルト名`vault`）を、`default`プロファイルと、ブランチを説明するルートの`README.md`付きで作成します。ブランチはまだ存在していてはいけません。受信者は`-r`または`-R`で必須です。

| オプション | 説明 |
| --- | --- |
| `-b`, `--branch NAME` | 作成するローカルブランチ（デフォルト: `vault`）。 |
| `-r`, `--recipient KEY` | 公開鍵（`-R`と併用不可）。 |
| `-R`, `--recipients-file PATH` | 受信者ファイル。`-`で標準入力（`-r`と併用不可）。 |
| `-l`, `--label TEXT` | 任意のラベル。省略するか、鍵ごと（`-r`）/`-R`の鍵行ごとに1つ。 |
| `-m`, `--message TEXT` | コミットメッセージ。段落ごとに繰り返し指定できる（`-F`と併用不可）。 |
| `-F`, `--message-file PATH` | UTF-8のコミットメッセージファイルを読む（`-m`と併用不可）。 |
| `-h`, `--help` | ヘルプを表示する。 |
