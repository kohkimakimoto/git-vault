#!/usr/bin/env bash
# Recipient input constraints and canonical JSON are enforced through the CLI.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1"
# Non-age public keys are rejected before calling age.
expect_exit 2 git vault init -b invalid-public -r invalid-public-recipient
[[ "$(cat "$TEST_ROOT/last.stderr")" == *'Invalid public key.'* ]] || fail 'Non-age public key was accepted'
# age-shaped but invalid recipients still preserve age's actionable diagnostic.
BAD_AGE='age1invalidrecipient000000000000000000000000000000000000000'
expect_exit 1 age --encrypt -r "$BAD_AGE" </dev/null
cp "$TEST_ROOT/last.stderr" "$TEST_ROOT/age-error"
expect_exit 1 git vault init -b invalid-age -r "$BAD_AGE"
[[ "$(cat "$TEST_ROOT/last.stderr")" == *"$(cat "$TEST_ROOT/age-error")"* ]] || fail 'age recipient diagnostic was suppressed'
expect_exit 2 git vault init -b missing
expect_exit 2 git vault init -b mixed -r "$RECIPIENT1" -R "$KEY1"
expect_exit 2 git vault init -b repeated-r -r "$RECIPIENT1" --recipient "$RECIPIENT2"
expect_exit 2 git vault init -b repeated-R -R "$KEY1" --recipients-file "$KEY2"
expect_exit 2 git vault restore -a -i "$KEY1" --identity "$KEY2"
expect_exit 2 git vault profiles add missing
expect_exit 2 git vault recipients add
expect_exit 2 git vault recipients remove
printf '# Team keys\n\n%s\n# Spare key\n%s\n\n' "$RECIPIENT2" "$RECIPIENT1" >"$TEST_ROOT/recipients.txt"
git vault init -b from-file -R "$TEST_ROOT/recipients.txt" -l spare -l master
assert_eq "$(git vault recipients list -b from-file | sort)" "$(printf '%s\n' "$RECIPIENT2  spare" "$RECIPIENT1  master" | sort)"
printf '# No keys\n\n' >"$TEST_ROOT/empty.txt"
expect_exit 2 git vault init -b empty -R "$TEST_ROOT/empty.txt"
expect_exit 2 git vault init -b labels -R "$TEST_ROOT/recipients.txt" -l missing
expect_exit 2 git vault init -b duplicate -R "$TEST_ROOT/recipients.txt" -r "$RECIPIENT1"
# Keep stdin open without supplying bytes: validation must finish before reading it.
python3 - <<'PY'
import subprocess
for arguments in (
    ['recipients', 'add', '-R', '-', '-i', '-'],
    ['recipients', 'remove', '-R', '-', '-i', '-'],
    ['init', '-b', 'twice-stdin', '-R', '-', '-R', '-'],
):
    process = subprocess.Popen(['git', 'vault', *arguments], stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        assert process.wait(timeout=5) == 2, arguments
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()
        raise AssertionError(f'CLI read stdin before rejecting {arguments}')
    finally:
        process.stdin.close()
PY
# Build malformed vault commits without checking out the vault branch.
git show vault:default/recipients.json >"$TEST_ROOT/canonical.json"
python3 - <<'PY'
import json
import os
from pathlib import Path
root = Path(os.environ['TEST_ROOT'])
text = (root / 'canonical.json').read_text()
doc = json.loads(text)
variants = {'compact': json.dumps(doc) + '\n', 'no-final-newline': text.rstrip('\n')}
for name, change in (
    ('null-label', lambda d: d['recipients'][0].update(label=None)),
    ('empty-label', lambda d: d['recipients'][0].update(label='')),
    ('unknown-field', lambda d: d['recipients'][0].update(extra=True)),
    ('duplicate-key', lambda d: d['recipients'].append(dict(d['recipients'][0]))),
    ('empty-list', lambda d: d.update(recipients=[])),
    ('wrong-version', lambda d: d.update(version=2)),
    ('boolean-version', lambda d: d.update(version=True)),
):
    value = json.loads(text)
    change(value)
    variants[name] = json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + '\n'
for name, value in variants.items():
    (root / f'invalid-{name}.json').write_text(value)
PY
for fixture in "$TEST_ROOT"/invalid-*.json; do
    blob="$(git hash-object -w "$fixture")"
    export GIT_INDEX_FILE="$TEST_ROOT/fixture-index"
    git read-tree vault
    git update-index --cacheinfo "100644,$blob,default/recipients.json"
    tree="$(git write-tree)"
    unset GIT_INDEX_FILE
    commit="$(printf 'Malformed fixture\n' | git commit-tree "$tree")"
    git update-ref refs/heads/invalid-json "$commit"
    expect_exit 1 git vault recipients list -b invalid-json
    [[ "$(cat "$TEST_ROOT/last.stderr")" == *'Invalid recipients file'* ]] || fail "Malformed JSON was not rejected: $fixture"
done
# -R - reads recipients from stdin.
printf '%s\n' "$RECIPIENT2" | git vault init -b from-stdin -R -
assert_eq "$(git vault recipients list -b from-stdin)" "$RECIPIENT2"
# Reject non-age public keys before calling age.
printf '%s\n' "$RECIPIENT1" 'not-an-age-recipient' >"$TEST_ROOT/unsupported.txt"
expect_exit 2 git vault init -b unsupported -R "$TEST_ROOT/unsupported.txt"
expect_exit 1 git show-ref --verify --quiet refs/heads/unsupported
