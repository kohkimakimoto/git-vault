#!/usr/bin/env bash
# Code worktrees can use the shared vault without changing their own branch or index.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1"
git worktree add -q -b code-work "$TEST_ROOT/linked-code"
cd "$TEST_ROOT/linked-code"
printf 'linked\n' >.env
index="$(git rev-parse --git-path index)"
cp "$index" "$TEST_ROOT/linked-index"
git vault save .env
rm .env
git vault restore -i "$KEY1" .env
assert_eq "$(cat .env)" linked
assert_eq "$(git symbolic-ref --short HEAD)" code-work
cmp "$index" "$TEST_ROOT/linked-index"
assert_eq "$(git diff --cached)" ''
