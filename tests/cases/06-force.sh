#!/usr/bin/env bash
# Force accepts tracked files, but saves working-tree bytes and leaves the index alone.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1"
printf 'staged\n' >app.txt
git add app.txt
printf 'working tree\n' >app.txt
remember_app_state
expect_exit 1 git vault save app.txt
git vault save --force app.txt
git show vault:default/files/app.txt | age -d -i "$KEY1" >"$TEST_ROOT/decrypted"
assert_eq "$(cat "$TEST_ROOT/decrypted")" 'working tree'
rm app.txt
expect_exit 1 git vault restore -i "$KEY1" app.txt
git vault restore -f -i "$KEY1" app.txt
assert_eq "$(cat app.txt)" 'working tree'
printf 'uncommitted change\n' >app.txt
expect_exit 1 git vault save -a
git vault save -a -f
expect_exit 1 git vault restore -a -i "$KEY1"
git vault restore -a -f -i "$KEY1"
assert_eq "$(cat app.txt)" 'uncommitted change'
assert_app_unchanged
