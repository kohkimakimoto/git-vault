#!/usr/bin/env bash
# Identity resolution follows Git scopes and consumes stdin only for decryption.
source "$(dirname "${BASH_SOURCE[0]}")/../common.sh"

git vault init -r "$RECIPIENT1"
printf 'one\n' >.env
printf 'two\n' >credentials
git vault save .env credentials

assert_restored() {
    assert_eq "$(cat .env)" one
    assert_eq "$(cat credentials)" two
}

# Only the highest scope applies, including duplicates in ignored lower scopes.
git config --file "$TEST_ROOT/system.config" vault.identity "$KEY1"
git config --file "$TEST_ROOT/global.config" vault.identity "$KEY2"
scoped_vault() {
    env GIT_CONFIG_NOSYSTEM=0 GIT_CONFIG_SYSTEM="$TEST_ROOT/system.config" \
        GIT_CONFIG_GLOBAL="$TEST_ROOT/global.config" git "$@"
}
expect_exit 1 scoped_vault vault restore -a -f
git config --file "$TEST_ROOT/global.config" --add vault.identity "$KEY3"
git config vault.identity "$KEY1"
scoped_vault vault restore -a -f
assert_restored

git config extensions.worktreeConfig true
git config --worktree vault.identity "$KEY2"
expect_exit 1 scoped_vault vault restore -a -f
scoped_vault -c vault.identity="$KEY1" vault restore -a -f
assert_restored
expect_exit 1 scoped_vault -c vault.identity="$KEY1" -c vault.identity="$KEY1" vault restore -a -f

git config --worktree --add vault.identity "$KEY1"
expect_exit 1 git vault restore -a -f
git vault restore -a -f -i "$KEY1"
assert_restored
git config --worktree --unset-all vault.identity
git config --unset-all vault.identity
git config --file "$TEST_ROOT/global.config" --unset-all vault.identity
scoped_vault vault restore -a -f
assert_restored

# Conditional includes participate in the selected local scope.
git config --file "$TEST_ROOT/included.config" vault.identity "$KEY1"
git config "includeIf.gitdir:$TEST_ROOT/repo/.git.path" "$TEST_ROOT/included.config"
git vault restore -a -f
assert_restored
git config --unset-all "includeIf.gitdir:$TEST_ROOT/repo/.git.path"

assert_config_rejected() {
    git config vault.identity "$1"
    expect_exit 1 git vault restore -a -f
    if grep -Fq Traceback "$TEST_ROOT/last.stderr"; then
        fail 'Invalid identity config produced a traceback'
    fi
    git vault restore -a -f -i "$KEY1"
    git config --unset-all vault.identity
}
for invalid in - relative/key "$TEST_ROOT/absent" '~git_vault_nonexistent_test_user/key' \
    '$UNKNOWN/key' '$HOME/.git/vaultkey.age'; do
    assert_config_rejected "$invalid"
done
assert_config_rejected $'/bad\ncommand\n/path'
assert_config_rejected $'/bad\r/path'
expect_exit 1 git vault restore -a -f -i '~git_vault_nonexistent_test_user/key'
if grep -Fq Traceback "$TEST_ROOT/last.stderr"; then
    fail 'Invalid CLI identity produced a traceback'
fi

# Placeholders expand to this repository; a global default can still be per-clone.
cp "$KEY1" .git/vaultkey.age
chmod 600 .git/vaultkey.age
git config --file "$TEST_ROOT/global.config" vault.identity '$GIT_COMMON_DIR/vaultkey.age'
scoped_vault vault restore -a -f
assert_restored
git config --file "$TEST_ROOT/global.config" vault.identity '${GIT_COMMON_DIR}/vaultkey.age'
scoped_vault vault restore -a -f
assert_restored
git config --file "$TEST_ROOT/global.config" vault.identity '$TOPLEVEL/.git/vaultkey.age'
scoped_vault vault restore -a -f
assert_restored
# Placeholder may appear mid-string (brace form after a path segment).
mkdir -p .git/mid
cp "$KEY1" .git/mid/vaultkey.age
chmod 600 .git/mid/vaultkey.age
git config --file "$TEST_ROOT/global.config" vault.identity 'pre${GIT_COMMON_DIR}/mid/vaultkey.age'
expect_exit 1 scoped_vault vault restore -a -f
git config --file "$TEST_ROOT/global.config" vault.identity '${GIT_COMMON_DIR}/mid/vaultkey.age'
scoped_vault vault restore -a -f
assert_restored
# Linked worktree resolves COMMON_DIR to the shared .git (not the worktree .git file).
git worktree add -q -b identity-work "$TEST_ROOT/identity-work"
(
    cd "$TEST_ROOT/identity-work"
    scoped_vault vault restore -a -f
)
assert_restored
git worktree remove --force "$TEST_ROOT/identity-work"
git config --file "$TEST_ROOT/global.config" --unset-all vault.identity
rm -rf .git/mid .git/vaultkey.age

# Empty operations do not resolve config or consume the supplied stdin stream.
git vault profiles add empty -r "$RECIPIENT1"
git config vault.identity relative/invalid
exec 3<"$KEY1"
git vault restore -p empty -a -i - <&3
assert_eq "$(cat <&3)" "$(cat "$KEY1")"
exec 3<&-
git vault restore -p empty -a
exec 3<"$KEY1"
git vault recipients add -p empty -r "$RECIPIENT2" -i - <&3
assert_eq "$(cat <&3)" "$(cat "$KEY1")"
exec 3<&-
git vault recipients remove -p empty -r "$RECIPIENT2"
git config --unset-all vault.identity

# A single stdin identity must decrypt all files during recipient changes.
git vault recipients add -r "$RECIPIENT2" -i - <"$KEY1"
git vault restore -a -f -i "$KEY2"
assert_restored
git vault recipients remove -r "$RECIPIENT1" -i - <"$KEY2"
git vault restore -a -f -i "$KEY2"
assert_restored
expect_exit 1 git vault restore -a -f -i "$KEY1"
