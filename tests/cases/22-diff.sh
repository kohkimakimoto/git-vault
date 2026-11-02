#!/usr/bin/env bash
# diff compares working-tree plaintext to the vault tip.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1"
printf 'one\n' >.env
printf 'two\n' >credentials
git vault save .env credentials
git vault restore -a -f -i "$KEY1"
# Matching files: exit 0, no diff output.
git vault diff -a -i "$KEY1" >"$TEST_ROOT/diff.out"
assert_eq "$(cat "$TEST_ROOT/diff.out")" ''
# Changed file: exit 1 and unified diff.
printf 'changed\n' >.env
expect_exit 1 git vault diff -a -i "$KEY1"
grep -Fq -- '--- a/.env' "$TEST_ROOT/last.stdout" || fail 'Expected --- a/.env'
grep -Fq -- '+++ b/.env' "$TEST_ROOT/last.stdout" || fail 'Expected +++ b/.env'
grep -Fq 'changed' "$TEST_ROOT/last.stdout" || fail 'Expected changed content in diff'
# Absent is reported and is not a difference by itself.
rm .env
git vault restore -f -i "$KEY1" credentials
expect_exit 0 git vault diff -a -i "$KEY1"
grep -Fq 'Absent: .env' "$TEST_ROOT/last.stdout" || fail 'Expected Absent for .env'
# Identity is required.
expect_exit 1 git vault diff -a
[[ "$(cat "$TEST_ROOT/last.stderr")" == *'No identity specified'* ]] || fail 'Expected missing identity error'
expect_exit 2 git vault diff
expect_exit 2 git vault diff -a .env
expect_exit 1 git vault diff missing.env -i "$KEY1"

# Missing final newlines must produce patches that preserve the exact bytes.
python3 - <<'PY'
import os
from pathlib import Path
import runpy
import subprocess
import tempfile

diff_text = runpy.run_path(str(Path(os.environ["PROJECT_DIR"]) / "bin/git-vault"))["unified_diff_text"]
cases = [
    (b"old", b"new"),
    (b"old\n", b"new"),
    (b"old", b"new\n"),
    (b"same", b"same\n"),
    (b"same\n", b"same"),
    (b"old\ntail", b"new\ntail"),
    (b"", b"new"),
    (b"old", b""),
]
with tempfile.TemporaryDirectory(dir=os.environ["TEST_ROOT"]) as directory:
    path = Path(directory) / "file"
    for stored, local in cases:
        patch = diff_text("file", stored, local).encode("utf-8")
        assert b"\\ No newline at end of file\n" in patch, patch
        path.write_bytes(stored)
        subprocess.run(["git", "apply", "--check", "-"], input=patch, cwd=directory, check=True)
        subprocess.run(["git", "apply", "-"], input=patch, cwd=directory, check=True)
        assert path.read_bytes() == local, (stored, local, patch)
PY
