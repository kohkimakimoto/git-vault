---
title: プロファイル
description: 同じvaultブランチ上でファイルと受信者をグループ化する。
section: guide
order: 4
---

プロファイルは、同じvaultブランチ上でファイルと[受信者](/ja/docs/guide/recipients)（age公開鍵）をグループ化します。`development`と`production`のように環境を分ける用途に使います。`init`は暗黙的に`default`プロファイルを作成します。


```sh
# 独自の公開鍵でproductionプロファイルを作成する
git vault profile add production -r age...

# .envをproductionプロファイルに暗号化する
git vault save -p production .env

# productionプロファイルに保存されたパスを一覧する
git vault list -p production

# vaultブランチ上の全プロファイルを一覧する
git vault profile list

# productionから.envを復元する
git vault restore -p production -f .env
```

同じパスを複数のプロファイルに保存できます。`-p`を省略すると`default`が選ばれます。

```sh
git vault save -p production -a
git vault restore -p production -a -f
git vault diff -p production -a
git vault clean -p production -a
```
