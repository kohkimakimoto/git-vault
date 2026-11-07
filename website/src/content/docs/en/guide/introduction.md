---
title: Introduction
description: What git-vault is and when it fits.
section: guide
order: 1
---

`git-vault` stores encrypted files in an orphan Git branch, separate from your application code.

Managing secrets such as API keys and passwords means balancing risk against operational cost. For smaller projects, encrypting secret files and committing them to the repository can be a practical choice.

git-vault keeps files such as `.env` encrypted on a dedicated branch in the same repository, so secrets can be managed alongside the code using familiar Git workflows — without adding encrypted files or configuration to the application branch.

## Trade-offs

This approach has limits: encrypted secrets are copied when the repository is cloned and remain in commit history, making complete deletion difficult. git-vault was built for projects where the convenience of keeping code and secrets in one repository is worth that trade-off.

## Requirements

- Python 3.11 or later
- Git
- [age](https://github.com/FiloSottile/age) (`age-keygen` is useful for generating keys)
- macOS or Linux
