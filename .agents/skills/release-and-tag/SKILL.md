---
name: release-and-tag
description: Mandatory step-by-step workflow for building, tagging, creating GitHub releases, and maintaining auto-update compatibility in Taskmaster Everywhere.
---

# Taskmaster Everywhere: Release & Tagging Skill

This skill guides you through executing an official release for Taskmaster Everywhere, ensuring that the in-app auto-updater detects the update and delivers direct download buttons to existing users.

## Checklist Before Release
- [ ] Ensure all code changes are tested and frontend builds cleanly (`pnpm run build`).
- [ ] Confirm no release binaries or `releases/` directory files are tracked in git (`git ls-files releases` must be empty).
- [ ] Verify version number matches across `package.json`, `src-tauri/tauri.conf.json`, and `src/utils/updater.ts`.

## Execution Steps

### 1. Analyze Previous Version & Changes
- Run `gh release list` or `git log $(git describe --tags --abbrev=0)..HEAD` to inspect changes since the last release tag.
- Summarize user-facing changes, bug fixes, UI improvements, and asset updates to formulate comprehensive release notes.

### 2. Version Bump Across All 3 Files
Set the target version `X.Y.Z` in:
- `package.json` -> `"version": "X.Y.Z"`
- `src-tauri/tauri.conf.json` -> `"version": "X.Y.Z"`
- `src/utils/updater.ts` -> `export const CURRENT_VERSION = "X.Y.Z";`

### 3. Compile and Package Tauri Release
Run:
```powershell
pnpm run release
```
This script runs `npm run build` and `tauri build`, creating the versioned portable (`Taskmaster-vX.Y.Z-Portable.exe`), versioned NSIS setup (`Taskmaster-vX.Y.Z-Setup.exe`), and versioned MSI installer (`Taskmaster-vX.Y.Z-Setup.msi`) in the `releases/` directory.

### 4. Commit Code Changes
Stage all modified source files (excluding `releases/`):
```powershell
git add .
git commit -m "chore(release): vX.Y.Z - <summary of changes>"
git push origin master
```

### 5. Create and Push Git Tag
Create an annotated tag and push it:
```powershell
git tag -a vX.Y.Z -m "Release vX.Y.Z - Taskmaster"
git push origin vX.Y.Z
```

### 6. Publish GitHub Release with Assets
Use the GitHub CLI (`gh`) to upload the 3 versioned binaries:
```powershell
gh release create vX.Y.Z `
  releases/Taskmaster-vX.Y.Z-Portable.exe `
  releases/Taskmaster-vX.Y.Z-Setup.exe `
  releases/Taskmaster-vX.Y.Z-Setup.msi `
  --title "Taskmaster vX.Y.Z" `
  --notes "<Release highlights>"
```

### 7. Verify Auto-Update Endpoint
Test that the GitHub release is live:
```powershell
gh release view vX.Y.Z
```
When an existing user opens an older version of the app, `checkForUpdate()` queries `https://api.github.com/repos/raktim-yoddha/todo-app/releases/latest`, receives the new release with its assets, and immediately prompts the user with the update pop-up to download the update.
