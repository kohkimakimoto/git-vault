#!/usr/bin/env bash
# Ciphertext under files/ is Git binary via a rewritten root .gitattributes.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"

assert_attr() {
    local path="$1" expected="$2"
    assert_eq "$(git check-attr --cached binary -- "$path")" "$path: binary: $expected"
}

drop_gitattributes() {
    export GIT_INDEX_FILE="$TEST_ROOT/$1-index"
    git read-tree vault
    git rm -q --cached .gitattributes
    tree="$(git write-tree)"
    unset GIT_INDEX_FILE
    git update-ref refs/heads/vault "$(git commit-tree "$tree" -p vault -m "$2")"
}

git vault init -r "$RECIPIENT1"
assert_eq "$(git show vault:.gitattributes)" $'**/files/** binary'

printf 'secret\n' >.env
git vault save .env
export GIT_INDEX_FILE="$TEST_ROOT/attr-index"
git read-tree vault
assert_attr default/files/.env set
assert_attr default/recipients.json unspecified
assert_attr README.md unspecified
unset GIT_INDEX_FILE

# Existing vaults without .gitattributes still load; the next save rewrites it.
drop_gitattributes old 'Vault without gitattributes'
expect_exit 128 git show vault:.gitattributes
assert_eq "$(git vault list)" .env
printf 'secret2\n' >.env
git vault save .env
assert_eq "$(git show vault:.gitattributes)" $'**/files/** binary'

# An empty pre-gitattributes vault can save -a to write the attributes file.
git vault profile add empty -r "$RECIPIENT1"
drop_gitattributes empty 'Empty vault without gitattributes'
git vault save -p empty -a
assert_eq "$(git show vault:.gitattributes)" $'**/files/** binary'

# Hand-edited .gitattributes is overwritten on the next commit.
export GIT_INDEX_FILE="$TEST_ROOT/tamper-index"
git read-tree vault
printf '* text\n' | git hash-object -w --stdin >"$TEST_ROOT/tamper-blob"
git update-index --cacheinfo "100644,$(cat "$TEST_ROOT/tamper-blob"),.gitattributes"
tamper_tree="$(git write-tree)"
unset GIT_INDEX_FILE
git update-ref refs/heads/vault "$(git commit-tree "$tamper_tree" -p vault -m 'Tampered gitattributes')"
git vault save -p empty -a
assert_eq "$(git show vault:.gitattributes)" $'**/files/** binary'
