---
title: インストール
description: Homebrewまたは手動でgit-vaultをインストールする。
section: guide
order: 2
---

<h2 id="homebrew">Homebrew</h2>

```sh
brew install kohkimakimoto/tap/git-vault
```

この方法では、Homebrewの依存関係として[age](https://github.com/FiloSottile/age)も一緒にインストールされます。

<h2 id="manual-installation">手動インストール</h2>

`bin/git-vault`を`PATH`上のディレクトリに置き、実行可能にしてください。

git-vaultは外部のGitサブコマンドです。Gitは、PATH上にある`git-xxx`という名前の実行ファイルを`git xxx`として呼び出せます。
