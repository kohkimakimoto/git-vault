#!/usr/bin/env bash
# Passphrase-protected age identities unlock once per operation.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
PTY="$TESTS_DIR/helpers/pty_passphrase.py"
PASS='test-passphrase'
if ! python3 -c 'import os, pty; m, s = pty.openpty(); os.close(m); os.close(s)' 2>/dev/null; then
    echo "SKIP: no pty devices available for passphrase prompts"
    exit 77
fi

python3 "$PTY" "$PASS" -- age -p -o "$TEST_ROOT/key1.age" "$KEY1"
# Public key is unchanged; ciphertext still uses the same recipient.
git vault init -r "$RECIPIENT1"
printf 'one\n' >.env
printf 'two\n' >credentials
git vault save .env credentials
rm .env credentials

# Multi-file restore must prompt only once (unlock), not once per file.
python3 "$PTY" "$PASS" -- git vault restore -a -f -i "$TEST_ROOT/key1.age" \
    2>"$TEST_ROOT/restore.pty"
assert_eq "$(cat .env)" one
assert_eq "$(cat credentials)" two
enters=$(grep -c 'Enter passphrase' "$TEST_ROOT/restore.pty" || true)
assert_eq "$enters" 1

rm .env credentials
git config vault.identity "$TEST_ROOT/key1.age"
python3 "$PTY" "$PASS" -- git vault restore -a -f
assert_eq "$(cat .env)" one
assert_eq "$(cat credentials)" two
git config --unset vault.identity

rm .env
# Shell redirects apply to the PTY helper, not the child. Feed identity via --stdin.
python3 "$PTY" "$PASS" --stdin "$TEST_ROOT/key1.age" -- git vault restore -f -i - .env
assert_eq "$(cat .env)" one

# Wrong passphrase fails without writing plaintext.
rm -f .env
expect_exit 1 python3 "$PTY" 'wrong-passphrase' -- git vault restore -f -i "$TEST_ROOT/key1.age" .env
assert_absent .env
[[ "$(cat "$TEST_ROOT/last.stderr")" == *'incorrect passphrase'* ]] \
    || [[ "$(cat "$TEST_ROOT/last.stderr")" == *'Failed to unlock identity file'* ]] \
    || fail "Expected unlock failure message"

# Plain identity still works without a passphrase prompt path.
git vault restore -f -i "$KEY1" .env
assert_eq "$(cat .env)" one
