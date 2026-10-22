#!/usr/bin/env bash
# clean removes working-tree plaintext for saved paths without touching the vault.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1"
printf 'one\n' >.env
printf 'two\n' >credentials
git vault save .env credentials
git vault restore -a -f -i "$KEY1"
assert_eq "$(cat .env)" one
assert_eq "$(cat credentials)" two
git vault clean .env
assert_absent .env
assert_eq "$(cat credentials)" two
git vault clean -a
assert_absent .env
assert_absent credentials
# Missing paths are reported, not errors.
git vault clean -a >"$TEST_ROOT/clean.out"
grep -Fq 'Absent: .env' "$TEST_ROOT/clean.out" || fail 'Expected Absent for .env'
grep -Fq 'Absent: credentials' "$TEST_ROOT/clean.out" || fail 'Expected Absent for credentials'
# Vault still has the files.
assert_eq "$(git vault list)" $'.env\ncredentials'
expect_exit 1 git vault clean missing.env
expect_exit 2 git vault clean
expect_exit 2 git vault clean -a .env
