---
title: プロファイル
description: 同じvaultブランチ上でファイルと受信者をグループ化する。
section: guide
order: 4
---

プロファイルは、同じvaultブランチ上でファイルと[受信者](/ja/docs/guide/recipients)（age公開鍵）をグループ化します。`development`と`production`のように環境を分ける用途に使います。`init`は暗黙的に`default`プロファイルを作成します。


```sh
# Create a production profile with its own public key
git vault profile add production -r age...

# Encrypt .env into the production profile
git vault save -p production .env

# List paths saved in the production profile
git vault list -p production

# List all profiles on the vault branch
git vault profile list

# Restore .env from production
git vault restore -p production -f .env
```

同じパスを複数のプロファイルに保存できます。`-p`を省略すると`default`が選ばれます。

```sh
git vault save -p production -a
git vault restore -p production -a -f
git vault diff -p production -a
git vault clean -p production -a
```
