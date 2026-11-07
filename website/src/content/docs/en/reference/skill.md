---
title: skill
description: Print or install the agent skill file.
section: reference
order: 16
---

```sh
git vault skill
git vault skill -o
git vault skill -o .claude/skills/git-vault/SKILL.md
```

Print agent skill content (`SKILL.md`) to stdout, or write it with `-o`.

| Option | Purpose |
| --- | --- |
| `-o`, `--output [PATH]` | Write the skill to a file; omitted path defaults to `.agents/skills/git-vault/SKILL.md`. |
| `-f`, `--force` | Overwrite an existing output file; requires `-o`. |
| `-h`, `--help` | Show help. |
