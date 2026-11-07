---
title: recipient remove
description: プロファイルからage公開鍵を削除する。
section: reference
order: 8
---

```sh
git vault recipient remove [options] (-r KEY | -R PATH)
```

`-r` / `-R`から公開鍵を削除します。プロファイルにファイルがある場合、残りの鍵向けに復号・再暗号化して、1つのコミットにまとめます。最後の公開鍵は削除できません。

再暗号化されるのはブランチ先端の現在のスナップショットだけです。古いコミットは、削除した受信者の秘密鍵で引き続き復号できます。以前共有したシークレット値を無効にするには、アプリケーションやサービス側で値をローテーションし、残りの受信者向けに新しい値を`save`してください。[アクセス権を取り消す](/ja/docs/guide/recipients#removing-access)を参照してください。

| オプション | 説明 |
| --- | --- |
| `-b`, `--branch NAME` | 使用するローカルブランチ（デフォルト: `vault`）。 |
| `-p`, `--profile NAME` | プロファイル（デフォルト: `default`）。 |
| `-r` / `-R` | 削除する公開鍵。 |
| `-i`, `--identity PATH` | プロファイルにファイルがある場合の再暗号化用identity。 |
| `-n` / `-B` / `-m` / `-F` | ブランチ作成とコミットメッセージ（[概要](/ja/docs/reference/overview)を参照）。 |
| `-h`, `--help` | ヘルプを表示する。 |
