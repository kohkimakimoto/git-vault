#!/usr/bin/env bash
# Key rotation re-encrypts every file in one profile, and preserves other profiles.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1"
printf 'development\n' >.env
git vault save .env
git show vault:default/files/.env >"$TEST_ROOT/default-ciphertext"
git vault profiles add production -r "$RECIPIENT2"
printf 'production\n' >.env
printf 'second secret\n' >credentials
git vault save -p production .env credentials
git vault recipients add -p production "$RECIPIENT3" <"$KEY2"
assert_eq "$(git vault recipients list -p production | wc -l | tr -d ' ')" 2
for key in "$KEY2" "$KEY3"; do
    git vault restore -p production -a -f -i "$key"
    assert_eq "$(cat .env)" production
    assert_eq "$(cat credentials)" 'second secret'
done
git show vault:default/files/.env >"$TEST_ROOT/unchanged"
cmp "$TEST_ROOT/default-ciphertext" "$TEST_ROOT/unchanged"
before="$(git rev-parse vault)"
expect_exit 1 git vault recipients remove -p production -i "$KEY1" "$RECIPIENT2"
assert_eq "$(git rev-parse vault)" "$before"
git vault recipients remove -p production -i "$KEY3" "$RECIPIENT2"
assert_eq "$(git vault recipients list -p production)" "$RECIPIENT3"
git vault restore -p production -a -f -i "$KEY3"
expect_exit 1 git vault restore -p production -a -f -i "$KEY2"
expect_exit 1 git vault recipients remove -p production "$RECIPIENT3"
expect_exit 1 git vault recipients add -p production "$RECIPIENT3"
expect_exit 1 git vault recipients remove -p production "$RECIPIENT1"
