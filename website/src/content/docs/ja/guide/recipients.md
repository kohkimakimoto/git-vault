---
title: 受信者
description: プロファイルを復号できる相手 — age公開鍵とラベル。
section: guide
order: 5
---

受信者とは、プロファイルのシークレットを利用できる相手（人、ボット、役割）です。各受信者は[age](https://github.com/FiloSottile/age)の公開鍵です（例: `age19438ccrwjqpmjhjpvp40aclyjnpllhgru62uak84knzs5n4k3y6q6ej2tq`）。ラベルはgit-vaultのメタデータであり、暗号化には公開鍵を使います。

各プロファイルは、受信者を`<profile>/recipients.json`にJSONとして保存します。CLIでは`-r` / `-R`で指定します。

```sh
# List recipients in the production profile
git vault recipient list -p production

# Same list as canonical JSON
git vault recipient list -p production --json

# Add a public key with a label (re-encrypts saved files when needed)
git vault recipient add -p production -l "deploy bot" -r age...

# Add public keys from a recipients file
git vault recipient add -p production -R teammates.txt

# Remove a public key (re-encrypts saved files when needed)
git vault recipient remove -p production -r age...

# Initialize a vault from a recipients file
git vault init -R teammates.txt
```

受信者は`-r KEY`または`-R PATH`で指定します（両方同時には使えません）。`-R`のファイルには、1行に1つずつ複数の鍵を書けます。任意の`-l` / `--label`は、`init`、`profile add`、`recipient add`で追加するときに、一意でなくてよい説明を付けます。

プロファイルに保存済みファイルがある場合、`recipient add`と`recipient remove`は[秘密鍵（identity）](/ja/docs/guide/private-keys)ですべての暗号文を復号し、更新後の公開鍵で再暗号化し、受信者一覧と暗号文をまとめてコミットします。最後の公開鍵は削除できません。いずれかの手順が失敗した場合、ブランチは変更されません。

<h2 id="removing-access">アクセス権を取り消す</h2>

`recipient remove`が再暗号化するのは、ブランチ先端の現在のスナップショットだけです。古いコミットは書き換えません。削除された受信者も、自分の秘密鍵で過去の暗号文を復号できます。以前共有したシークレットの値を使えなくする必要がある場合は、アプリケーションやサービス側でその値をローテーションし、残りの受信者向けに新しい値を`save`してください。
