# Releasing Rai (with auto-updates)

Releases are built on GitHub's Windows runners and published as GitHub Releases.
Existing users auto-update from them on next launch.

## One-time setup

Generate an update signing keypair (needs no compiler, uses Node):

```powershell
npx @tauri-apps/cli@latest signer generate -w rai.key
```

Then in the repo: **Settings > Secrets and variables > Actions**, add:

- `TAURI_SIGNING_PRIVATE_KEY` = contents of the `rai.key` file
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` = the password you chose

The matching **public** key lives in `src-tauri/tauri.conf.json` under
`plugins.updater.pubkey`. Keep the private key and password secret.

> The repo (or at least its releases) must be **public** for downloads and
> auto-updates to be reachable.

## Cut a release

1. Bump the version in `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`.
2. Update `CHANGELOG.md`.
3. Commit and push to `main`.
4. Tag and push the tag (must start with `v`):
   ```powershell
   git tag v0.4.0
   git push origin v0.4.0
   ```
5. Watch the **Actions** tab until the build is green.
6. Go to **Releases**, open the draft "Rai v0.4.0", review, and **Publish**.

Publishing makes `releases/latest` point to it, so the website Download button and
the in-app auto-updater both pick it up.
