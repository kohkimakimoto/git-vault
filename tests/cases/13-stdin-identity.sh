#!/usr/bin/env bash
# -i - reads identity from stdin once and reuses it across restore -a.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1"
printf 'one\n' >.env
printf 'two\n' >credentials
git vault save .env credentials
rm .env credentials
git vault restore -a -f -i - <"$KEY1"
assert_eq "$(cat .env)" one
assert_eq "$(cat credentials)" two
