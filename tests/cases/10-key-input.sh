#!/usr/bin/env bash
# File and stdin inputs support multiple keys; failed input does not expose a key.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT3"
printf 'secret\n' >.env
git vault save .env
git vault restore -f -i "$KEY1" -i "$KEY3" .env
cat "$KEY1" "$KEY3" | git vault restore -f .env
# Explicit identity files take precedence over redirected stdin.
printf 'not a key\n' | git vault restore -f -i "$KEY3" .env
rm .env
expect_exit 1 git vault restore .env </dev/null
printf 'PRIVATE-MALFORMED-SECRET' >"$TEST_ROOT/bad-key"
expect_exit 1 git vault restore .env <"$TEST_ROOT/bad-key"
if grep -Fq PRIVATE-MALFORMED-SECRET "$TEST_ROOT/last.stderr"; then
    fail 'Key contents leaked into diagnostics'
fi
assert_absent .env
expect_exit 1 git vault restore -i "$KEY2" .env
assert_absent .env
