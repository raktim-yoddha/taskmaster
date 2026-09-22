# Taskmaster Everywhere - AI Agent Guidelines & Release Protocol

This repository contains **Taskmaster Everywhere**, a high-performance Tauri + React + TypeScript productivity app.
All AI assistants (Claude, Cursor, Copilot, Gemini, Antigravity, etc.) working on this repository **MUST** adhere to the following mandatory guidelines.

---

## 1. Version Synchronization & Auto-Update Integrity

The app features an in-app auto-update system that compares the running version with the latest release on GitHub (`https://api.github.com/repos/raktim-yoddha/todo-app/releases/latest`).

Whenever releasing or bumping the version, you **MUST** synchronize the version across **all three** files:
1. `package.json` -> `"version": "X.Y.Z"`
2. `src-tauri/tauri.conf.json` -> `"version": "X.Y.Z"`
3. `src/utils/updater.ts` -> `export const CURRENT_VERSION = "X.Y.Z";`

Failure to update all three files will cause version mismatch bugs where users are repeatedly notified of phantom updates or never receive update alerts.

---

## 2. Git Tracking & Releases Directory Rule

- **NEVER** track binary release files (`.exe`, `.msi`, `.zip`, `.tar.gz`) in Git.
- The `releases/` directory is strictly for local build output and **MUST** remain ignored in `.gitignore`.
- Never execute `git add releases/` or commit any binary files to the git history.

---

## 3. Mandatory Release & Tagging Workflow

Whenever the user instructs to **"release version X.Y.Z"** (or says "release", "tag", or "bump version"):
**DO NOT ONLY DO `git push`**. Simply pushing commits to `master` will **NOT** trigger the auto-updater for existing users!

You **MUST** automatically analyze the previous release version and execute the complete 6-step release pipeline so that existing/previous versions receive the in-app update pop-up:

### Step 1: Analyze Previous Version & Changes
- Run `gh release list` or `git log $(git describe --tags --abbrev=0)..HEAD` to inspect changes since the last release tag.
- Summarize all user-facing changes, features, bug fixes, UI improvements, and asset updates to generate clear, professional release notes.

### Step 2: Synchronize Version Across All 3 Files
Update the version string to `X.Y.Z` in:
1. `package.json` -> `"version": "X.Y.Z"`
2. `src-tauri/tauri.conf.json` -> `"version": "X.Y.Z"`
3. `src/utils/updater.ts` -> `export const CURRENT_VERSION = "X.Y.Z";`

### Step 3: Build Production Binaries
Run:
```powershell
pnpm run release
```
Ensure all 3 release binaries are produced in `releases/`:
- `releases/Taskmaster-Everywhere-Portable.exe`
- `releases/Taskmaster-Everywhere-Setup.exe`
- `releases/Taskmaster-Everywhere-Setup.msi`

### Step 4: Git Commit & Push Changes
Stage and commit all source code and configuration changes:
```powershell
git add .
git commit -m "chore(release): vX.Y.Z - <summary of changes>"
git push origin master
```

### Step 5: Create & Push Git Tag
Create an annotated git tag and push it to GitHub:
```powershell
git tag -a vX.Y.Z -m "Release vX.Y.Z - Taskmaster Everywhere"
git push origin vX.Y.Z
```

### Step 6: Publish GitHub Release with Attached Assets
Publish the release using the GitHub CLI (`gh`) and attach all 3 binaries:
```powershell
gh release create vX.Y.Z `
  releases/Taskmaster-Everywhere-Portable.exe `
  releases/Taskmaster-Everywhere-Setup.exe `
  releases/Taskmaster-Everywhere-Setup.msi `
  --title "Taskmaster Everywhere vX.Y.Z" `
  --notes "<Changelog and release highlights>"
```

### Step 7: Verify Update Pop-Up Integrity
Verify that GitHub API `https://api.github.com/repos/raktim-yoddha/todo-app/releases/latest` reflects tag `vX.Y.Z` and contains the 3 uploaded binaries.

> **Why this is critical:**
> Older app versions query GitHub API's `releases/latest`. When a GitHub Release is published with attached assets, older versions running any earlier version will detect `isNewerVersion()` and immediately trigger the "vX.Y.Z Available!" in-app modal with direct one-click download buttons for the installer and portable `.exe`.
