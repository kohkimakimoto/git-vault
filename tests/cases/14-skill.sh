#!/usr/bin/env bash
# Skill output works outside Git, and installation is explicit and non-clobbering.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
mkdir "$TEST_ROOT/plain-directory"
cd "$TEST_ROOT/plain-directory"
git vault skill >"$TEST_ROOT/skill.stdout" 2>"$TEST_ROOT/skill.stderr"
[[ -s "$TEST_ROOT/skill.stdout" ]] || fail 'Skill output was empty'
[[ ! -s "$TEST_ROOT/skill.stderr" ]] || fail 'Unexpected stdout-mode diagnostics'
assert_absent .agents

# The direct executable only needs Python, not git or age, for this command.
python_bin="$(python3 -c 'import sys; print(sys.executable)')"
PATH='' "$python_bin" "$PROJECT_DIR/bin/git-vault" skill >"$TEST_ROOT/standalone"
cmp "$TEST_ROOT/skill.stdout" "$TEST_ROOT/standalone"

git vault skill -o >"$TEST_ROOT/file.stdout" 2>"$TEST_ROOT/file.stderr"
[[ ! -s "$TEST_ROOT/file.stdout" ]] || fail 'File mode wrote to stdout'
cmp "$TEST_ROOT/skill.stdout" .agents/skills/git-vault/SKILL.md
printf 'existing instructions\n' >.agents/skills/git-vault/SKILL.md
expect_exit 1 git vault skill -o
assert_eq "$(cat .agents/skills/git-vault/SKILL.md)" 'existing instructions'
git vault skill --output --force
cmp "$TEST_ROOT/skill.stdout" .agents/skills/git-vault/SKILL.md

git vault skill -o .claude/skills/git-vault/SKILL.md
cmp "$TEST_ROOT/skill.stdout" .claude/skills/git-vault/SKILL.md
git vault skill -o "$TEST_ROOT/absolute path/nested/SKILL.md"
cmp "$TEST_ROOT/skill.stdout" "$TEST_ROOT/absolute path/nested/SKILL.md"
expect_exit 2 git vault skill -f
expect_exit 1 git vault skill -o .agents -f
printf 'keep this\n' >"$TEST_ROOT/target"
ln -s "$TEST_ROOT/target" linked-skill
expect_exit 1 git vault skill -o linked-skill -f
assert_eq "$(cat "$TEST_ROOT/target")" 'keep this'
git vault skill -h >/dev/null
