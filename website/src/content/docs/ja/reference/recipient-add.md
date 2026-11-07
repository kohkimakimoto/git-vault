---
title: recipient add
description: プロファイルにage公開鍵を追加する。
section: reference
order: 7
---

```sh
git vault recipient add [options] (-r KEY | -R PATH) [-l TEXT]...
```

`-r` / `-R`から公開鍵を追加します。プロファイルにファイルがある場合、各暗号文を復号し、更新後の公開鍵向けに再暗号化して、1つのコミットにまとめます。プロファイルが空でない限り、復号用のidentityが必要です。

| オプション | 説明 |
| --- | --- |
| `-b`, `--branch NAME` | 使用するローカルブランチ（デフォルト: `vault`）。 |
| `-p`, `--profile NAME` | プロファイル（デフォルト: `default`）。 |
| `-r` / `-R` | 追加する公開鍵。 |
| `-i`, `--identity PATH` | 再暗号化用のidentity。`-i -`で標準入力、または`vault.identity`。 |
| `-l`, `--label TEXT` | 任意のラベル。省略するか、鍵ごと / `-R`の鍵行ごとに1つ。 |
| `-n` / `-B` / `-m` / `-F` | ブランチ作成とコミットメッセージ（[概要](/ja/docs/reference/overview)を参照）。 |
| `-h`, `--help` | ヘルプを表示する。 |
