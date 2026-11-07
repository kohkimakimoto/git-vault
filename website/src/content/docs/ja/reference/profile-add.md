---
title: profile add
description: 独自の受信者を持つプロファイルを作成する。
section: reference
order: 4
---

```sh
git vault profile add [options] NAME (-r KEY | -R PATH) [-l TEXT]...
```

`NAME`というプロファイルを、独自の受信者を持ちファイルは含まない状態で作成します。プロファイルはまだ存在していてはいけません。プロファイル名はASCIIの英字または数字で始まり、英字・数字・`.`・`_`・`-`のみを含めます。受信者は`-r`または`-R`で必須です。

| オプション | 説明 |
| --- | --- |
| `-b`, `--branch NAME` | 使用するローカルブランチ（デフォルト: `vault`）。 |
| `-r`, `--recipient KEY` | 公開鍵（`-R`と併用不可）。 |
| `-R`, `--recipients-file PATH` | 受信者ファイル。`-`で標準入力（`-r`と併用不可）。 |
| `-l`, `--label TEXT` | 任意のラベル。省略するか、鍵ごと（`-r`）/`-R`の鍵行ごとに1つ。 |
| `-n`, `--new-branch` | 指定した`-b`ブランチを作成する。既にある場合は失敗する。 |
| `-B`, `--base REF` | 作成時のベース（デフォルト: `vault`）。`-n`が必要。 |
| `-m` / `-F` | コミットメッセージ（[概要](/ja/docs/reference/overview)を参照）。 |
| `-h`, `--help` | ヘルプを表示する。 |
