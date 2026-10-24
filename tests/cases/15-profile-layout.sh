#!/usr/bin/env bash
# Profiles are root directories; legacy commands and layouts are not accepted.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1"
git show vault:README.md | grep -q 'managed by'
git vault profile add production -r "$RECIPIENT2"
assert_eq "$(git ls-tree --name-only vault)" $'README.md\ndefault\nproduction'
expect_exit 2 git vault profile add README.md -r "$RECIPIENT1"
printf 'production secret\n' >.env
git vault save --profile production .env
git show vault:production/files/.env | age -d -i "$KEY2" >"$TEST_ROOT/decrypted"
cmp .env "$TEST_ROOT/decrypted"
assert_eq "$(git vault recipient list --profile production)" "$RECIPIENT2"

# The former wrapper name is not reserved: it can be a normal profile name.
git vault profile add sections -r "$RECIPIENT1"
git vault save -p sections .env
git vault restore -p sections -f -i "$KEY1" .env
expect_exit 2 git vault sections list
expect_exit 2 git vault list --section production
expect_exit 2 git vault list -s production

# Construct the old layout using ordinary Git, without migration or CLI imports.
current_tree="$(git rev-parse 'vault^{tree}')"
legacy_tree="$(printf '040000 tree %s\tsections\0' "$current_tree" | git mktree -z)"
legacy_commit="$(git commit-tree "$legacy_tree" -m 'Legacy layout fixture')"
git update-ref refs/heads/legacy-layout "$legacy_commit"
expect_exit 1 git vault list -b legacy-layout
