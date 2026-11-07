---
title: recipient list
description: プロファイルの受信者を一覧表示する。
section: reference
order: 6
---

```sh
git vault recipient list [options]
```

選択したプロファイルの受信者を一覧表示します。デフォルトの行形式は`KEY`または`KEY  LABEL`です。`--json`は正規化された保存済みJSONを出力します。

| オプション | 説明 |
| --- | --- |
| `-b`, `--branch NAME` | 使用するローカルブランチ（デフォルト: `vault`）。 |
| `-p`, `--profile NAME` | プロファイル（デフォルト: `default`）。 |
| `--json` | 受信者を正規化されたJSONとして出力する。 |
| `-h`, `--help` | ヘルプを表示する。 |
