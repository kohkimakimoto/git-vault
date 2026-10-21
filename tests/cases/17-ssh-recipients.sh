#!/usr/bin/env bash
# SSH recipients work through age; -R files and mixed age+SSH are supported.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
command -v ssh-keygen >/dev/null || { echo "Missing test command: ssh-keygen" >&2; exit 1; }
ssh-keygen -t ed25519 -N '' -f "$TEST_ROOT/id_ed25519" -q
SSH_PUB="$(cat "$TEST_ROOT/id_ed25519.pub")"
SSH_KEY="$TEST_ROOT/id_ed25519"
git vault init -R "$TEST_ROOT/id_ed25519.pub" -l laptop
printf 'ssh-secret\n' >.env
git vault save .env
git vault restore -f -i "$SSH_KEY" .env
assert_eq "$(cat .env)" ssh-secret
git vault recipients add -i "$SSH_KEY" -r "$RECIPIENT1" -l age-master
git vault restore -f -i "$KEY1" .env
assert_eq "$(cat .env)" ssh-secret
git vault restore -f -i "$SSH_KEY" .env
assert_eq "$(cat .env)" ssh-secret
# -R - reads recipients from stdin.
printf '%s\n' "$RECIPIENT2" | git vault init -b from-stdin -R -
assert_eq "$(git vault recipients list -b from-stdin)" "$RECIPIENT2"
expect_exit 2 git vault recipients add -R - -i - <"$TEST_ROOT/id_ed25519.pub"
