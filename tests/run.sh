#!/usr/bin/env bash
# Run each independent CLI scenario; stop at the first failure.
set -eu -o pipefail
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
passed=0
skipped=0
for test_script in "$TEST_DIR"/cases/*.sh; do
    echo "Running $(basename "$test_script")..."
    status=0
    bash "$test_script" || status=$?
    case "$status" in
        0) passed=$((passed + 1)) ;;
        77) skipped=$((skipped + 1)) ;;
        *) exit "$status" ;;
    esac
done
echo "$passed shell scenarios passed; $skipped skipped."
