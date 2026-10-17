#!/usr/bin/env bash
# Only terminal driving needs Python; the operation itself is a real git vault command.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1"
printf 'interactive value\n' >.env
git vault save .env
cp .env "$TEST_ROOT/expected"
rm .env
status=0
python3 "$TESTS_DIR/helpers/interactive.py" "$KEY1" || status=$?
case "$status" in
    0) cmp .env "$TEST_ROOT/expected" ;;
    77) exit 77 ;; # The helper reports the skipped terminal check explicitly.
    *) exit "$status" ;;
esac
