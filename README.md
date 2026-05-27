# ssgyms-logbook

Toolcraft-based CLI and MCP stdio server for `app.ssgyms.com/logbook`.

## Install From GitHub

Requires Node.js 20+ and npm.

```sh
npm install -g https://github.com/kamilio/ssgyms-logbook/archive/refs/heads/main.tar.gz
ssgyms-logbook --help
ssgyms-logbook-mcp --help
```

This installs directly from the GitHub repository archive and was verified with npm. To pin an installation to a particular revision, replace `refs/heads/main` with a commit SHA archive path, for example:

```sh
npm install -g https://github.com/kamilio/ssgyms-logbook/archive/<commit-sha>.tar.gz
```

Avoid npm git dependency forms such as `git+ssh://...` or `github:kamilio/ssgyms-logbook` for global installation: npm may create executable shims pointing at an evicted temporary git checkout instead of a stable package directory.

For local development from a clone:

```sh
git clone git@github.com:kamilio/ssgyms-logbook.git
cd ssgyms-logbook
npm install
npm test
npm link
```

The repository includes compiled CLI/MCP binaries in `dist/`, so GitHub installation does not require TypeScript or a build step on the target machine.

## Commands

```sh
ssgyms-logbook list-workouts --output json
ssgyms-logbook create-workout --date 2026-05-23 --exercise squat=3x5@245 press=3x5@100 --output json
ssgyms-logbook log-workout --id <workout-id> --exercise squat=3x5@245 press=3x5@100 --note "Good session" --output json
ssgyms-logbook delete-workout --id <workout-id> --output json
ssgyms-logbook auth login --output json
printf '%s' '<refresh-token>' | ssgyms-logbook auth save --token-stdin --output json
ssgyms-logbook-mcp
```

`create-workout` creates a planned workout; `log-workout` records completed sets and marks an existing workout complete, matching the web app model. Exercise input uses `exercise=setsxreps@weight`, such as `deadlift=1x5@315`.

Use `--id` for deletion because Firebase workout IDs begin with a hyphen.

## Authentication

The CLI exchanges a Firebase refresh credential for short-lived access tokens and does not store browser cookies in the repository. For first-time setup or renewed authentication, `auth login` opens the normal SSGYMS passwordless web login in a headed browser and saves only the resulting refresh credential after login succeeds. When Firebase rotates the refresh credential during token renewal, the CLI automatically replaces the encrypted value.

- Encrypted credential file: `~/.config/ssgyms-logbook/credentials.enc` with mode `0600`; its directory is mode `0700`.
- Encryption: AES-256-GCM using a key derived locally from the machine hostname and Unix username, allowing unattended SSH use on the same Mac/user account.
- `ssgyms-logbook auth login` performs the regular browser sign-in flow and stores its reusable credential in the encrypted file.
- `ssgyms-logbook auth status` validates configured authentication.
- `ssgyms-logbook auth save --token-stdin` securely imports a refresh credential on an SSH-only machine without placing it in shell history.
- `ssgyms-logbook auth save --refresh-token <token>` also stores a replacement credential, but exposes it in process arguments and is not recommended on shared systems.
- `ssgyms-logbook auth remove` removes the encrypted credential file.

The refresh credential avoids ordinary repeated logins, but SSGYMS/Firebase may still revoke or expire it. Because unattended encryption must be decryptable without a prompt, an attacker with access as the same OS user on the same machine can decrypt the credential; file permissions remain essential protection.

For an SSH-only Mac mini, perform interactive `auth login` on a machine with a browser, then provision its refresh credential once through `auth save --token-stdin` on the Mac mini. The encrypted credential file is machine-bound and should not be copied between hosts.

## MCP

Run `ssgyms-logbook-mcp` as an MCP stdio server. It exposes only `list_workouts`, `create_workout`, `log_workout`, and `delete_workout`; credential-management commands remain CLI-only.

Example MCP configuration:

```json
{
  "mcpServers": {
    "ssgyms-logbook": {
      "command": "ssgyms-logbook-mcp"
    }
  }
}
```
