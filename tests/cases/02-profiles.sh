#!/usr/bin/env bash
# Profiles have independent files and cannot be created or removed accidentally.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1"
git vault profiles add production -r "$RECIPIENT2"
assert_eq "$(git vault profiles list)" $'default\nproduction'
printf 'development\n' >.env
git vault save .env
git show vault:default/files/.env >"$TEST_ROOT/default-ciphertext"
printf 'production\n' >.env
git vault save -p production .env
git show vault:default/files/.env >"$TEST_ROOT/unchanged"
cmp "$TEST_ROOT/default-ciphertext" "$TEST_ROOT/unchanged"
git vault restore -p default -f -i "$KEY1" .env
assert_eq "$(cat .env)" development
git vault restore -p production -f -i "$KEY2" .env
assert_eq "$(cat .env)" production
expect_exit 1 git vault profiles add production -r "$RECIPIENT1"
expect_exit 1 git vault profiles remove production
expect_exit 1 git vault profiles remove default
expect_exit 1 git vault save -p typo .env
git vault remove -p production .env
git vault profiles remove production
assert_eq "$(git vault profiles list)" default

git vault profiles add empty -r "$RECIPIENT1" -r "$RECIPIENT2"
git vault recipients add -p empty "$RECIPIENT3" </dev/null
before="$(git rev-parse vault)"
git vault save -p empty -a
git vault restore -p empty -a </dev/null
assert_eq "$(git rev-parse vault)" "$before"
