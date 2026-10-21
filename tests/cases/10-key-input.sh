#!/usr/bin/env bash
# File and -i - inputs support multiple keys; failed input does not expose a key.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT3"
printf 'secret\n' >.env
git vault save .env
# Multiple secrets belong in one identity file (not repeated -i).
cat "$KEY1" "$KEY3" >"$TEST_ROOT/combined-identity"
git vault restore -f -i "$TEST_ROOT/combined-identity" .env
git vault restore -f -i - .env <"$KEY3"
expect_exit 2 git vault restore -f -i "$KEY1" -i "$KEY3" .env
# Explicit identity files take precedence over redirected stdin (stdin is not read).
printf 'not a key\n' | git vault restore -f -i "$KEY3" .env
rm .env
expect_exit 1 git vault restore .env
expect_exit 1 git vault restore -i - .env </dev/null
printf 'PRIVATE-MALFORMED-SECRET' >"$TEST_ROOT/bad-key"
expect_exit 1 git vault restore -i - .env <"$TEST_ROOT/bad-key"
if grep -Fq PRIVATE-MALFORMED-SECRET "$TEST_ROOT/last.stderr"; then
    fail 'Key contents leaked into diagnostics'
fi
assert_absent .env
expect_exit 1 git vault restore -i "$KEY2" .env
assert_absent .env
# vault.identity default when -i is omitted.
git config vault.identity "$KEY3"
git vault restore -f .env
assert_eq "$(cat .env)" secret
git config --unset vault.identity
