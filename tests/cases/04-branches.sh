#!/usr/bin/env bash
# New branches require an explicit request and retain the specified base.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1"
printf 'value\n' >.env
remember_app_state
base="$(git rev-parse vault)"
expect_exit 1 git vault save -b typo .env
expect_exit 2 git vault save -n .env
expect_exit 2 git vault save -B vault .env
git vault save -b vault-change -n -B vault .env
assert_eq "$(git rev-parse vault)" "$base"
assert_eq "$(git rev-parse vault-change^)" "$base"
git vault save -b vault-change .env
expect_exit 1 git vault save -b vault-change -n .env
expect_exit 1 git vault save -b failed-change -n missing
expect_exit 1 git show-ref --verify --quiet refs/heads/failed-change
expect_exit 1 git vault init -b invalid-keys -r "age$(printf '%059d' 0 | tr 0 q)"
expect_exit 1 git show-ref --verify --quiet refs/heads/invalid-keys
expect_exit 1 git vault restore --revision main -f -i "$KEY1" .env
assert_app_unchanged

# Normal merge commit messages do not need a format marker.
git worktree add -q "$TEST_ROOT/merge-tree" vault
git -C "$TEST_ROOT/merge-tree" merge -q --no-ff vault-change -m 'Merge secret update'
expect_exit 1 git vault save .env
git worktree remove "$TEST_ROOT/merge-tree"
assert_eq "$(git vault list)" .env
