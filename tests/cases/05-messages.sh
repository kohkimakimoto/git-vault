#!/usr/bin/env bash
# Automatic messages have a prefix; explicit messages do not.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1" -m 'Initialize secrets'
assert_eq "$(git log -1 --format=%B vault)" 'Initialize secrets'
printf 'value\n' >.env
git vault save .env
assert_eq "$(git log -1 --format=%B vault)" $'git-vault: Save files in section default\n\n.env'
git vault save -m Title -m Body .env
assert_eq "$(git log -1 --format=%B vault)" $'Title\n\nBody'
printf 'Custom title\n\nCustom body\n' >"$TEST_ROOT/message"
git vault save -F "$TEST_ROOT/message" .env
assert_eq "$(git log -1 --format=%B vault)" "$(cat "$TEST_ROOT/message")"
expect_exit 2 git vault save -m '' .env
expect_exit 2 git vault save -F - .env
expect_exit 2 git vault save -m message -F "$TEST_ROOT/message" .env
git vault list --no-color >"$TEST_ROOT/list"
assert_eq "$(cat "$TEST_ROOT/list")" .env
git vault -h >/dev/null
git vault save -h >/dev/null
