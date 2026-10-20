#!/usr/bin/env bash
# Optional recipient labels are metadata only; pairing and storage stay consistent.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
sorted_lines() {
    printf '%s\n' "$@" | sort
}
git vault init -r "$RECIPIENT1" -l 'Alice laptop' -r "$RECIPIENT2" -l 'Bob (staging)'
sorted_lines "$RECIPIENT1 Alice laptop" "$RECIPIENT2 Bob (staging)" >"$TEST_ROOT/expected"
git vault recipients list >"$TEST_ROOT/list"
cmp "$TEST_ROOT/expected" "$TEST_ROOT/list"
git show vault:default/recipients >"$TEST_ROOT/stored"
cmp "$TEST_ROOT/expected" "$TEST_ROOT/stored"
expect_exit 2 git vault init -b other -r "$RECIPIENT1" -l only-one -r "$RECIPIENT2"
expect_exit 2 git vault init -b other -r "$RECIPIENT1" -l ''
git vault profiles add production -r "$RECIPIENT3" -l 'deploy bot'
assert_eq "$(git vault recipients list -p production)" "$RECIPIENT3 deploy bot"
printf 'secret\n' >.env
git vault save -p production .env
git vault recipients add -p production -i "$KEY3" -l 'shared spare' "$RECIPIENT1"
sorted_lines "$RECIPIENT1 shared spare" "$RECIPIENT3 deploy bot" >"$TEST_ROOT/expected"
git vault recipients list -p production >"$TEST_ROOT/list"
cmp "$TEST_ROOT/expected" "$TEST_ROOT/list"
git vault recipients remove -p production -i "$KEY1" "$RECIPIENT1"
assert_eq "$(git vault recipients list -p production)" "$RECIPIENT3 deploy bot"
git vault restore -p production -a -f -i "$KEY3"
assert_eq "$(cat .env)" secret
# Unlabeled recipients remain valid and list as the bare key.
git vault init -b unlabeled -r "$RECIPIENT1"
assert_eq "$(git vault recipients list -b unlabeled)" "$RECIPIENT1"
