#!/usr/bin/env bash
# Shared setup and small assertions; test operations belong in cases/*.sh.
set -eu -o pipefail
TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$TESTS_DIR")"
for variable in ${!GIT_@}; do unset "$variable"; done
export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
export PATH="$PROJECT_DIR/bin:$PATH"
for tool in python3 git age age-keygen; do
    command -v "$tool" >/dev/null || { echo "Missing test command: $tool" >&2; exit 1; }
done
TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/git-vault-tests.XXXXXX")"
TEST_ROOT="$(cd "$TEST_ROOT" && pwd -P)"
trap 'rm -rf "$TEST_ROOT"' EXIT
trap 'echo "FAIL: ${BASH_SOURCE[0]}:$LINENO" >&2' ERR
export TEST_ROOT TESTS_DIR

fail() { echo "FAIL: $*" >&2; exit 1; }
assert_eq() { [[ "$1" == "$2" ]] || fail "Expected [$2], got [$1]"; }
assert_absent() { [[ ! -e "$1" && ! -L "$1" ]] || fail "Unexpected path: $1"; }
expect_exit() {
    local expected="$1" actual=0
    shift
    "$@" >"$TEST_ROOT/last.stdout" 2>"$TEST_ROOT/last.stderr" || actual=$?
    if [[ "$actual" != "$expected" ]]; then
        cat "$TEST_ROOT/last.stderr" >&2
        fail "Expected exit $expected, got $actual: $*"
    fi
}
new_repo() {
    mkdir -p "$1"
    git -C "$1" init -q -b main
    git -C "$1" config user.name 'Vault Test'
    git -C "$1" config user.email vault@example.invalid
    printf 'application\n' >"$1/app.txt"
    git -C "$1" add app.txt
    git -C "$1" commit -q -m 'Initial application'
}
remember_app_state() {
    git rev-parse HEAD >"$TEST_ROOT/app-head"
    cp .git/index "$TEST_ROOT/app-index"
    cp .git/info/exclude "$TEST_ROOT/app-exclude"
}
assert_app_unchanged() {
    assert_eq "$(git rev-parse HEAD)" "$(cat "$TEST_ROOT/app-head")"
    cmp .git/index "$TEST_ROOT/app-index"
    cmp .git/info/exclude "$TEST_ROOT/app-exclude"
    assert_absent .gitignore
}
for number in 1 2 3; do
    age-keygen -o "$TEST_ROOT/key$number" 2>/dev/null
done
KEY1="$TEST_ROOT/key1"; KEY2="$TEST_ROOT/key2"; KEY3="$TEST_ROOT/key3"
RECIPIENT1="$(age-keygen -y "$KEY1")"
RECIPIENT2="$(age-keygen -y "$KEY2")"
RECIPIENT3="$(age-keygen -y "$KEY3")"
export KEY1 KEY2 KEY3
new_repo "$TEST_ROOT/repo"
cd "$TEST_ROOT/repo"
