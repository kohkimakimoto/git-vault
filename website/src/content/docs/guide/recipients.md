---
title: Recipients
description: Who may decrypt a profile — age public keys and labels.
section: guide
order: 5
---

A recipient is who may use a profile's secrets (a person, bot, or role). Each recipient is an [age](https://github.com/FiloSottile/age) public key (for example `age1...`). Labels are git-vault metadata; encryption uses the public key.

Each profile stores recipients as JSON at `<profile>/recipients.json`. CLI input uses `-r` / `-R`:

```sh
# List recipients in the production profile
git vault recipient list -p production

# Same list as canonical JSON
git vault recipient list -p production --json

# Add a public key with a label (re-encrypts saved files when needed)
git vault recipient add -p production -l "deploy bot" -r age...

# Add public keys from a recipients file
git vault recipient add -p production -R teammates.txt

# Remove a public key (re-encrypts saved files when needed)
git vault recipient remove -p production -r age...

# Initialize a vault from a recipients file
git vault init -R teammates.txt
```

Provide recipients with `-r KEY` or `-R PATH` (not both). `-R` may list several keys, one per line. Optional `-l` / `--label` attaches a non-unique description when adding via `init`, `profile add`, or `recipient add`.

When the profile has saved files, `recipient add` and `recipient remove` decrypt every ciphertext with a [private identity](/docs/guide/private-keys), re-encrypt for the updated public keys, and commit the list and ciphertexts together. The last public key cannot be removed. If any step fails, the branch is left unchanged.

## Removing access

`recipient remove` re-encrypts only the current snapshot at the branch tip; it does not rewrite older commits. A removed recipient can still decrypt older ciphertext with their private key. If previously shared secret values must stop working, rotate those values in the application or service and `save` the new values for the remaining recipients.
