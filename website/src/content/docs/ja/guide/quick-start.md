---
title: クイックスタート
description: 数ステップで.envファイルを暗号化して復元する。
section: guide
order: 3
---

この例では、アプリケーションのシークレットを含む`.env`ファイルを暗号化して保存します。

<h2 id="before-you-start">始める前に</h2>

- [git-vaultをインストール](/ja/docs/guide/installation)し、[要件](/ja/docs/guide/introduction#requirements)を確認してください。
- 既存の`.env`があるアプリケーションリポジトリのルートでコマンドを実行してください。始める前に、`.gitignore`で`.env`をGitの管理対象から除外してください。
- この手順では、新しいローカルの`vault`ブランチと`.git/vaultkey.age`を作成します。すでにvaultがある場合は、[クローンと同期](/ja/docs/guide/clone-and-sync)を参照してください。既存のidentityファイルを上書きしないでください。
- 公開用のコマンドは、`origin`という名前のGitリモートが設定されていることを前提とします。

<h2 id="set-a-default-identity-path">identityの既定パスを設定する</h2>

一度だけ、ユーザー全体の既定値を設定し、各リポジトリがクローンごとの鍵を参照するようにします。

```sh
git config --global vault.identity '$GIT_COMMON_DIR/vaultkey.age'
```

`$GIT_COMMON_DIR`はgit-vaultのプレースホルダーです。`git rev-parse --git-common-dir`が返す絶対パスに展開されます。

<h2 id="create-an-identity">identityを作成する</h2>

```sh
age-keygen | age -p > .git/vaultkey.age
chmod 600 .git/vaultkey.age
```

`age -p`はパスフレーズの入力を求めます。以降の`age...`は、`age-keygen`が出力した公開鍵全体に置き換えてください。

<h2 id="initialize-and-save">初期化して保存する</h2>

```sh
git vault init -r age...
git vault save .env
git vault list
git push origin vault
```

`init`は履歴を共有しない`vault`ブランチを作成します。`save`は元の平文ファイルを残します。平文をGitの管理対象から除外するのは利用者の責任です（例: `.gitignore`）。

<h2 id="restore">復元する</h2>

`save`のあとも`.env`はそのまま残ります。作業ツリーの状態に合った例を選んでください。

まだなく、未追跡の`.env`を復元する場合:

```sh
git vault restore .env
```

`save`の直後など、既存の`.env`を上書きする場合:

```sh
git vault restore -f .env
```

`-f`はローカルの変更を保存済みの内容で置き換えます。`-f`がない場合、`restore`は既存ファイルと追跡済みパスへの復元を拒否します。どちらの例も、上で設定したidentityを使い、そのパスフレーズの入力を求めます。その他のオプションは[restore](/ja/docs/reference/restore)を参照してください。
