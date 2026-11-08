---
title: 作業ブランチ
description: サイドブランチとプルリクエスト経由でvaultを更新する。
section: guide
order: 8
---

`-b`は操作対象のローカルvaultブランチ名を指定します。`init`はそのブランチを作成し、同名が既にある場合は拒否します。それ以外のコマンドは既存のブランチが必要です。ただし、対応している場合は`-n`を渡すと新規作成できます。

```sh
# リモート追跡ブランチを更新する（origin/vaultを含む）
git fetch origin

# fetchしたvaultの先端から作業ブランチを作り、変更を保存する
git vault save -p production -b vault-update-db -n -B origin/vault .env

# 既存の作業ブランチにもう1つコミットを追加する
git vault save -p production -b vault-update-db credentials.json

# プルリクエスト用に作業ブランチをpushする
git push origin vault-update-db
```

ホスティングサービス上で、`vault-update-db`から`vault`へのプルリクエストを作成します。`-B`を省略すると、新しいブランチはローカルの`vault`ブランチから始まります。`-n`には明示的な`-b`が必要で、そのブランチが既にある場合は失敗します。`-B`には`-n`が必要です。

同じ`-b` / `-n` / `-B`オプションは、`remove`、`profile add` / `remove`、`recipient add` / `remove`にも使えます。`vault-update-db`のような名前を推奨します。Gitでは`vault`と`vault/update-db`を同時に持てません。
