---
title: 秘密鍵
description: 復号と再暗号化のために、git-vaultがageのidentityをどう見つけるか。
section: guide
order: 6
---

復号にはidentity（秘密鍵）が必要です。対象は`restore`、`diff`、通常の`clean`（`clean -f`を除く）、およびプロファイルにファイルがあるときの`recipient add` / `remove`です。次の順で解決します。

1. `-i` / `--identity PATH`。`-i -`で標準入力からidentityを読めます。`vault.identity`より優先されます。
2. それ以外は`git config vault.identity`（後述）。

```sh
# 明示的なidentityファイルで復元する
git vault restore -i /path/to/identity .env

# リダイレクトで標準入力からidentityを読む
git vault restore -i - .env < /path/to/identity

# パイプでも同じ。-aはそのプロファイルの保存済みパスをすべて復元する
cat /path/to/identity | git vault restore -a -i -

# クローンごとのパスを使うユーザー全体の既定値
git config --global vault.identity '$GIT_COMMON_DIR/vaultkey.age'

# vault.identityを使って復元する
git vault restore .env
```

`-i -`は操作ごとに一度だけ読み込み、一時ファイルに保存して、その操作内のすべての復号で再利用します。

<h2 id="vaultidentity"><code>vault.identity</code></h2>

既定のidentityファイルパスは`git config`で設定します。値には`$GIT_COMMON_DIR`または`$TOPLEVEL`（`${…}`形式も可）を含められ、git-vaultが設定を読むときに展開します。

| プレースホルダー | 展開先（`git rev-parse`と同じ考え方） |
|---|---|
| `$GIT_COMMON_DIR` | `--git-common-dir`（絶対パス） |
| `$TOPLEVEL` | `--show-toplevel`（絶対パス） |

これらは設定値内のgit-vaultプレースホルダーであり、シェル変数や環境変数ではありません。未知の`$NAME` / `${NAME}`形式は拒否されます。各クローンが`.git/`配下に独自の鍵を持てるよう、`$GIT_COMMON_DIR`を使った**ユーザー全体**の設定を推奨します。

```sh
# ユーザーマシンごとに一度（シェルが$…を展開しないようクォートする）
git config --global vault.identity '$GIT_COMMON_DIR/vaultkey.age'
```

この設定は`~/.gitconfig`に書き込まれます。例:

```ini
[vault]
	identity = $GIT_COMMON_DIR/vaultkey.age
```

<h2 id="recommended-practice">推奨する運用</h2>

クローンごとに、ローカルのGitディレクトリ配下へパスフレーズ保護されたidentityを作成します。

```sh
age-keygen | age -p > .git/vaultkey.age
chmod 600 .git/vaultkey.age
```

リポジトリの管理者には、[受信者](/ja/docs/guide/recipients)として登録してもらうため、公開鍵（`Public key: age...`）だけを渡してください。identityファイルやパスフレーズは共有しないでください。
