---
title: Working branches
description: Update the vault via a side branch and pull request.
section: guide
order: 8
---

`-b` names the local vault branch to operate on. `init` creates that branch and rejects an existing name. Other commands require an existing branch, unless you pass `-n` (where supported) to create one.

```sh
# Update remote-tracking branches (including origin/vault)
git fetch origin

# Create a working branch from the fetched vault tip and save a change
git vault save -p production -b vault-update-db -n -B origin/vault .env

# Add another commit to the existing working branch
git vault save -p production -b vault-update-db credentials.json

# Publish the working branch for a pull request
git push origin vault-update-db
```

Create a pull request from `vault-update-db` to `vault` using your hosting service. If `-B` is omitted, new branches start from the local `vault` branch. `-n` requires an explicit `-b` and fails if that branch already exists. `-B` requires `-n`.

The same `-b` / `-n` / `-B` options apply to `remove`, `profile add` / `remove`, and `recipient add` / `remove`. Prefer names such as `vault-update-db`; Git cannot have both `vault` and `vault/update-db`.
