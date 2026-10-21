#!/usr/bin/env bash
# Optional recipient labels are metadata only; pairing and storage stay consistent.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
sorted_lines() {
    printf '%s\n' "$@" | sort
}
printf '%s\n' "$RECIPIENT1" "$RECIPIENT2" >"$TEST_ROOT/init-recipients.txt"
git vault init -R "$TEST_ROOT/init-recipients.txt" -l 'Alice laptop' -l 'Bob (staging)'
sorted_lines "$RECIPIENT1  Alice laptop" "$RECIPIENT2  Bob (staging)" >"$TEST_ROOT/expected"
git vault recipients list >"$TEST_ROOT/list"
cmp "$TEST_ROOT/expected" "$TEST_ROOT/list"
git vault recipients list --json >"$TEST_ROOT/listed.json"
git show vault:default/recipients >"$TEST_ROOT/stored"
cmp "$TEST_ROOT/listed.json" "$TEST_ROOT/stored"
expect_exit 2 git vault init -b other -R "$TEST_ROOT/init-recipients.txt" -l only-one
expect_exit 2 git vault init -b other -r "$RECIPIENT1" -l ''
expect_exit 2 git vault init -b other -r "$RECIPIENT1" -r "$RECIPIENT2"
git vault profiles add production -r "$RECIPIENT3" -l 'deploy bot'
assert_eq "$(git vault recipients list -p production)" "$RECIPIENT3  deploy bot"
printf 'secret\n' >.env
git vault save -p production .env
git vault recipients add -p production -i "$KEY3" -l 'shared spare' -r "$RECIPIENT1"
sorted_lines "$RECIPIENT1  shared spare" "$RECIPIENT3  deploy bot" >"$TEST_ROOT/expected"
git vault recipients list -p production >"$TEST_ROOT/list"
cmp "$TEST_ROOT/expected" "$TEST_ROOT/list"
git vault recipients remove -p production -i "$KEY1" -r "$RECIPIENT1"
assert_eq "$(git vault recipients list -p production)" "$RECIPIENT3  deploy bot"
git vault restore -p production -a -f -i "$KEY3"
assert_eq "$(cat .env)" secret
git vault init -b unlabeled -r "$RECIPIENT1"
assert_eq "$(git vault recipients list -b unlabeled)" "$RECIPIENT1"
