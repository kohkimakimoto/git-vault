#!/usr/bin/env bash
# Sections have independent files and cannot be created or removed accidentally.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1"
git vault sections add production -r "$RECIPIENT2"
assert_eq "$(git vault sections list)" $'default\nproduction'
printf 'development\n' >.env
git vault save .env
git show vault:sections/default/files/.env >"$TEST_ROOT/default-ciphertext"
printf 'production\n' >.env
git vault save -s production .env
git show vault:sections/default/files/.env >"$TEST_ROOT/unchanged"
cmp "$TEST_ROOT/default-ciphertext" "$TEST_ROOT/unchanged"
git vault restore -s default -f -i "$KEY1" .env
assert_eq "$(cat .env)" development
git vault restore -s production -f -i "$KEY2" .env
assert_eq "$(cat .env)" production
expect_exit 1 git vault sections add production -r "$RECIPIENT1"
expect_exit 1 git vault sections remove production
expect_exit 1 git vault sections remove default
expect_exit 1 git vault save -s typo .env
git vault remove -s production .env
git vault sections remove production
assert_eq "$(git vault sections list)" default

git vault sections add empty -r "$RECIPIENT1" -r "$RECIPIENT2"
git vault recipients add -s empty "$RECIPIENT3" </dev/null
before="$(git rev-parse vault)"
git vault save -s empty -a
git vault restore -s empty -a </dev/null
assert_eq "$(git rev-parse vault)" "$before"
