#!/usr/bin/env bash
# Binary round trips, history, all-files operations, and unchanged app state.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
remember_app_state
git vault init --recipient "$RECIPIENT1"
assert_eq "$(git rev-list --parents vault)" "$(git rev-parse vault)"
initial="$(git rev-parse vault)"
expect_exit 1 git vault init -r "$RECIPIENT1"

mkdir config.age
printf 'vault-test-secret\000\377\n' >.env
cp .env "$TEST_ROOT/expected"
for file in 'space name' '日本語' '-leading' config config.age/token; do
    cp .env "$file"
done
git vault save -- .env 'space name' '日本語' '-leading' config config.age/token
saved="$(git rev-parse vault)"
assert_eq "$(git rev-parse vault^)" "$initial"
assert_eq "$(git vault list | wc -l | tr -d ' ')" 6
# The suffix is not added, so these two original paths coexist.
git show vault:sections/default/files/config >"$TEST_ROOT/ciphertext"
age -d -i "$KEY1" "$TEST_ROOT/ciphertext" >"$TEST_ROOT/decrypted"
cmp "$TEST_ROOT/expected" "$TEST_ROOT/decrypted"
rm -- .env 'space name' '日本語' '-leading' config config.age/token
rmdir config.age
git vault restore --all <"$KEY1"
for file in .env 'space name' '日本語' '-leading' config config.age/token; do
    cmp "./$file" "$TEST_ROOT/expected"
    assert_eq "$(ls -ld -- "$file" | cut -c1-10)" '-rw-------'
done
assert_eq "$(ls -ld config.age | cut -c1-10)" 'drwx------'
expect_exit 1 git vault restore -i "$KEY1" .env
printf 'changed\n' >.env
git vault save -a
git vault restore -f -R "$saved" -i "$KEY1" .env
cmp .env "$TEST_ROOT/expected"
rm config.age/token
before="$(git rev-parse vault)"
expect_exit 1 git vault save -a
assert_eq "$(git rev-parse vault)" "$before"
git vault remove .env
[[ -f .env ]] || fail 'remove deleted plaintext'
expect_exit 128 git show vault:sections/default/files/.env
git show "$saved:sections/default/files/.env" >/dev/null
assert_app_unchanged

# Plaintext and private identities must not appear in any stored blob.
while read -r oid kind; do
    [[ "$kind" == blob ]] || continue
    git cat-file blob "$oid" >"$TEST_ROOT/object"
    if grep -aEq 'vault-test-secret|AGE-SECRET-KEY-' "$TEST_ROOT/object"; then
        fail 'Plaintext or a private identity was stored in Git'
    fi
done < <(git cat-file --batch-all-objects --batch-check='%(objectname) %(objecttype)')
