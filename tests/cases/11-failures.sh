#!/usr/bin/env bash
# A corrupt second ciphertext must not cause partial restore or key rotation.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1"
printf 'first secret\n' >first
printf 'second secret\n' >second
git vault save first second
rm first second

# Build the failure fixture with standard Git and a separate temporary index.
bad_blob="$(printf 'not age' | git hash-object -w --stdin)"
export GIT_INDEX_FILE="$TEST_ROOT/fixture-index"
git read-tree vault
git update-index --cacheinfo "100644,$bad_blob,default/files/second"
tree="$(git write-tree)"
unset GIT_INDEX_FILE
commit="$(git commit-tree "$tree" -p vault -m 'Corrupt ciphertext fixture')"
git update-ref refs/heads/vault "$commit"
expect_exit 1 git vault restore -a -i - <"$KEY1"
assert_absent first
assert_absent second
expect_exit 1 git vault recipients add -r "$RECIPIENT2" -i "$KEY1"
assert_eq "$(git rev-parse vault)" "$commit"
