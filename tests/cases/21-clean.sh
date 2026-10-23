#!/usr/bin/env bash
# Default clean compares to the tip; -f deletes without an identity.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1"
printf 'one\n' >.env
printf 'two\n' >credentials
git vault save .env credentials
git vault restore -a -f -i "$KEY1"
assert_eq "$(cat .env)" one
assert_eq "$(cat credentials)" two
# Matching files are deleted when an identity is available.
git vault clean -i "$KEY1" .env
assert_absent .env
assert_eq "$(cat credentials)" two
git vault clean -a -i "$KEY1"
assert_absent .env
assert_absent credentials
# Missing paths are reported, not errors (identity still required).
git vault clean -a -i "$KEY1" >"$TEST_ROOT/clean.out"
grep -Fq 'Absent: .env' "$TEST_ROOT/clean.out" || fail 'Expected Absent for .env'
grep -Fq 'Absent: credentials' "$TEST_ROOT/clean.out" || fail 'Expected Absent for credentials'
# Vault still has the files.
assert_eq "$(git vault list)" $'.env\ncredentials'
expect_exit 1 git vault clean missing.env -i "$KEY1"
expect_exit 2 git vault clean
expect_exit 2 git vault clean -a .env
# Divergent plaintext aborts without deleting anything.
git vault restore -a -f -i "$KEY1"
printf 'changed\n' >.env
expect_exit 1 git vault clean -a -i "$KEY1"
assert_eq "$(cat .env)" changed
assert_eq "$(cat credentials)" two
grep -Fq -- '--- a/.env' "$TEST_ROOT/last.stdout" || fail 'Expected unified diff on clean abort'
[[ "$(cat "$TEST_ROOT/last.stderr")" == *'Working tree differs from the vault'* ]] || fail 'Missing clean abort message'
# -f deletes without identity even when divergent.
git vault clean -a -f
assert_absent .env
assert_absent credentials
# Without -f, identity is required when files exist.
git vault restore -a -f -i "$KEY1"
expect_exit 1 git vault clean -a
[[ "$(cat "$TEST_ROOT/last.stderr")" == *'No identity specified'* ]] || fail 'Expected missing identity error'
assert_eq "$(cat .env)" one
