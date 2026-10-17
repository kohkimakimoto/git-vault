#!/usr/bin/env bash
# Path restrictions still apply with force; subdirectory calls use relative paths.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1"
printf 'outside\n' >"$TEST_ROOT/outside"
ln -s "$TEST_ROOT/outside" link
ln -s "$TEST_ROOT" linked-directory
for path in link linked-directory/outside "$TEST_ROOT/outside" ../outside .git/config 'dir\file'; do
    expect_exit 1 git vault save -f -- "$path"
done
mkdir sub
printf 'nested\n' >sub/.env
cd sub
git vault save .env
rm .env
git vault restore -i "$KEY1" .env
assert_eq "$(cat .env)" nested
cd ..
expect_exit 2 git vault save -a sub/.env
expect_exit 2 git vault save
expect_exit 1 git vault save -b main sub/.env
git symbolic-ref refs/heads/alias refs/heads/vault
expect_exit 1 git vault list -b alias
# A symlink must not be followed during restore, even with force.
rm sub/.env
ln -s "$TEST_ROOT/outside" sub/.env
expect_exit 1 git vault restore -f -i "$KEY1" sub/.env
assert_eq "$(cat "$TEST_ROOT/outside")" outside
