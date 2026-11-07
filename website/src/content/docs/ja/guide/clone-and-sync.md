---
title: クローンと同期
description: 既存のvaultに参加し、ローカルのvaultブランチを最新に保つ。
section: guide
order: 7
---

`origin`にすでに`vault`ブランチがある場合は、このガイドを使ってください。新しいvaultを作成する場合は、[クイックスタート](/ja/docs/guide/quick-start)を参照してください。

[git-vaultをインストール](/ja/docs/guide/installation)し、[要件](/ja/docs/guide/introduction#requirements)を確認してから、アプリケーションのリポジトリをクローンします。以下のコマンドはそのルートで実行してください。アプリケーションのブランチに留まったままでよく、`vault`をチェックアウトする必要はありません。

<h2 id="prepare-a-decryption-identity">復号用のidentityを準備する</h2>

新しいマシンやクローンごとに、[秘密鍵](/ja/docs/guide/private-keys)の手順でidentityを作成し、`vault.identity`を設定します。リポジトリの管理者に、必要なプロファイルの[受信者](/ja/docs/guide/recipients)としてその公開鍵を追加してもらい、更新されたvaultブランチをpushしてもらってからfetchしてください。

新しいidentityを作成するだけでは、既存の暗号文にはアクセスできません。その公開鍵をプロファイルに登録する必要があります。identityファイル（秘密鍵）とパスフレーズはローカルに保管してください。

<h2 id="restore-from-an-existing-vault">既存のvaultから復元する</h2>

アプリケーションのリポジトリをクローンしたら、リモートのvaultを追跡するローカルブランチを作成します。

```sh
git fetch origin vault
git branch --track vault origin/vault
git vault restore .env
```

この例は、`.env`が`default`プロファイルに保存されており、作業ツリーには存在しないことを前提とします。別のプロファイルには`-p NAME`、保存済みファイルをすべて復元するには`-a`を使います。上書きオプションは[restore](/ja/docs/reference/restore)を参照してください。

ローカルの`vault`ブランチがすでに存在する場合は、`git branch --track`の代わりに、次の[既存のローカルvaultを同期する](#sync-an-existing-local-vault)を先に実行してから復元してください。fetchが更新するのは`origin/vault`であり、git-vaultが読むのはローカルの`vault`ブランチです。

<h2 id="sync-an-existing-local-vault">既存のローカルvaultを同期する</h2>

ローカルのvaultブランチをチェックアウトせずにfast-forwardします。

```sh
git fetch origin vault:vault
```

更新されるのはローカルブランチだけです。平文ファイルを更新したいときは、別途`git vault restore`を実行してください。

ローカルとリモートのvaultブランチが分岐している場合、Gitはこの更新を拒否します。必要な平文の変更を保持し、最新の`origin/vault`から作った[新しい作業ブランチ](/ja/docs/guide/working-branches)で再適用してください。
