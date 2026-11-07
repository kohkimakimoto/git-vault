---
title: Profiles
description: Group files and recipients on the same vault branch.
section: guide
order: 4
---

Profiles group files and [recipients](/docs/guide/recipients) (age public keys) on the same vault branch. Use them to separate environments such as `development` and `production`. `init` creates a `default` profile implicitly.


```sh
# Create a production profile with its own public key
git vault profile add production -r age...

# Encrypt .env into the production profile
git vault save -p production .env

# List paths saved in the production profile
git vault list -p production

# List all profiles on the vault branch
git vault profile list

# Restore .env from production
git vault restore -p production -f .env
```

The same path can be saved in multiple profiles. `default` is selected when `-p` is omitted.

```sh
git vault save -p production -a
git vault restore -p production -a -f
git vault diff -p production -a
git vault clean -p production -a
```
