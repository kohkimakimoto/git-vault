#!/usr/bin/env bash
# Test concurrent branch updates through the CLI, without importing its implementation.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1"
printf 'value\n' >.env
export REAL_GIT="$(command -v git)"
tree="$(git rev-parse 'vault^{tree}')"
export RACE_OID="$(git commit-tree "$tree" -p vault -m 'Competing update')"
export RACE_REF=refs/heads/vault
original_path="$PATH"
export PATH="$TESTS_DIR/helpers:$PATH"
# Git prepends its exec directory to PATH when launching a subcommand.
# Keep the competing-update fixture first for the CLI's Git subprocesses too.
export GIT_EXEC_PATH="$TESTS_DIR/helpers"
expect_exit 3 git vault save .env
assert_eq "$(git rev-parse vault)" "$RACE_OID"
export RACE_REF=refs/heads/vault-race
expect_exit 3 git vault save -b vault-race -n .env
assert_eq "$(git rev-parse vault-race)" "$RACE_OID"
export PATH="$original_path"
unset GIT_EXEC_PATH
