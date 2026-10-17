#!/usr/bin/env bash
# Clone initialization, ordinary push/fetch, and reapplying a divergent change.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"
git vault init -r "$RECIPIENT1"
printf 'first\n' >.env
git vault save .env
git init -q --bare "$TEST_ROOT/remote.git"
git remote add origin "$TEST_ROOT/remote.git"
git push -q origin main vault
for name in clone-a clone-b; do
    git clone -q -b main "$TEST_ROOT/remote.git" "$TEST_ROOT/$name"
    cd "$TEST_ROOT/$name"
    git config user.name 'Vault Test'
    git config user.email vault@example.invalid
    git branch --track vault origin/vault
    git vault restore -a <"$KEY1"
    assert_eq "$(cat .env)" first
done
cd "$TEST_ROOT/clone-a"
printf 'from A\n' >.env
git vault save .env
git push -q origin vault
cd "$TEST_ROOT/clone-b"
printf 'from B\n' >.env
git vault save .env
expect_exit 1 git push origin vault
git fetch -q origin
git vault save -b vault-change -n -B origin/vault .env
git push -q origin vault-change
assert_eq "$(git rev-parse vault-change^)" "$(git rev-parse origin/vault)"
git show vault-change:sections/default/files/.env | age -d -i "$KEY1" >"$TEST_ROOT/decrypted"
assert_eq "$(cat "$TEST_ROOT/decrypted")" 'from B'
