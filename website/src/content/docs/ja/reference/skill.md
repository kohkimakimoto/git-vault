---
title: skill
description: エージェント用skillファイルを表示またはインストールする。
section: reference
order: 16
---

```sh
git vault skill
git vault skill -o
git vault skill -o .claude/skills/git-vault/SKILL.md
```

エージェント用skillの内容（`SKILL.md`）を標準出力に表示するか、`-o`で書き出します。

| オプション | 説明 |
| --- | --- |
| `-o`, `--output [PATH]` | skillをファイルに書き出す。パス省略時のデフォルトは`.agents/skills/git-vault/SKILL.md`。 |
| `-f`, `--force` | 既存の出力ファイルを上書きする。`-o`が必要。 |
| `-h`, `--help` | ヘルプを表示する。 |
