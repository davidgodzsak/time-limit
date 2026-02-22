# CI/CD Setup Guide: Publishing to Firefox & Chrome

This guide walks through setting up GitHub Actions to automatically publish your extension to both Firefox Add-ons (AMO) and Chrome Web Store when you create a GitHub release.

## Overview

**Workflow triggers on**: GitHub Release Published (on: release: types: [published])

**Job Architecture**:
```
build
  ├─ publish-firefox  (parallel, needs: build)
  └─ publish-chrome   (parallel, needs: build)
        └─ deploy-status (always runs, reports results)
```

**What each job does**:
1. **build**: Checkout, lint, update manifest with version, build dist/, create zips, upload artifacts
2. **publish-firefox**: Download dist artifact, sign with web-ext, submit source code to AMO for review
3. **publish-chrome**: Download zip artifact, exchange refresh token for access token, upload and publish
4. **deploy-status**: Update release notes with status table showing results of all jobs

## Prerequisites

### 1. Firefox Add-ons (AMO)

#### Get API Credentials
1. Go to [https://addons.mozilla.org/en-US/developers/](https://addons.mozilla.org/en-US/developers/)
2. Sign in with your Mozilla account
3. Go to **Settings** → **API Keys**
4. Click **Issue New Credentials**
5. Copy the **API Key** and **API Secret**

### 2. Chrome Web Store

1. Follow: https://developer.chrome.com/docs/webstore/using-api#beforeyoubegin
2. Obtain Client ID, Client Secret, and Refresh Token
3. Find your Extension ID in Chrome Web Store Dashboard

## GitHub Setup - Add Secrets to GitHub

1. Go to your GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:

| Secret Name | Value | Where to Get |
|---|---|---|
| `FIREFOX_API_KEY` | Your Mozilla API Key | Firefox Add-ons Developer Hub → Settings → API Keys |
| `FIREFOX_API_SECRET` | Your Mozilla API Secret | Firefox Add-ons Developer Hub → Settings → API Keys |
| `CHROME_CLIENT_ID` | Your Google Client ID | Google Cloud Console → OAuth credentials |
| `CHROME_CLIENT_SECRET` | Your Google Client Secret | Google Cloud Console → OAuth credentials |
| `CHROME_REFRESH_TOKEN` | Your OAuth Refresh Token | Generated via Google OAuth2 |
| `CHROME_EXTENSION_ID` | Your Chrome Web Store Extension ID | Chrome Web Store Dashboard |

## Workflow Architecture

The publish workflow consists of **4 parallel/sequential jobs**:

### 1. `build` Job
- Extracts version from release tag (e.g., `v1.5.1` → `1.5.1`)
- Runs linting **before any side effects** (fail fast if lint fails)
- Updates `src/manifest.json` with version
- Builds extension with `npm run build`
- Creates two zip files:
  - **Extension zip**: Contains only `dist/` directory (for stores)
  - **Source zip**: Contains full source (for AMO review)
- Commits manifest update with `[skip ci]` message
- Uploads zips to GitHub Release

### 2. `publish-firefox` Job (parallel with chrome)
- Downloads built `dist/` from artifacts
- Uses `web-ext sign` to sign the extension
- Uploads source code to AMO for review
- Status: `continue-on-error: true` (allows deploy-status to report partial success)

### 3. `publish-chrome` Job (parallel with firefox)
- Downloads zip from artifacts
- Exchanges refresh token for access token via Google OAuth2
- Uploads zip to Chrome Web Store
- Publishes extension
- Status: `continue-on-error: true`

### 4. `deploy-status` Job (runs after all, always)
- Reads results of build, publish-firefox, and publish-chrome
- Updates the GitHub release notes with a status table:
  - ✅ Success
  - ❌ Failure
  - ⏭️ Cancelled
  - ⚠️ Other states

## Creating a Release

The release **version is the source of truth**. The workflow automatically updates `manifest.json` based on the release tag.

### Simple 2-Step Process:

**Step 1: Create a GitHub Release**

Using GitHub CLI:
```bash
git tag v1.5.1
git push origin v1.5.1

# Or go to GitHub UI:
# 1. Go to Releases page
# 2. Click "Create a new release"
# 3. Set tag to "v1.5.1" (use semantic versioning)
# 4. Add release notes explaining changes
# 5. Click "Publish release"
```

## How Versioning Works

### The Flow:

1. **You create a release** with tag `v1.5.1`
2. **Workflow extracts version** → `1.5.1`
3. **Workflow updates manifest.json** → `"version": "1.5.1"`
4. **Workflow commits change** with message `chore: update manifest.json to v1.5.1 [skip ci]`
5. **Build & publish** proceeds with updated manifest

### Note: Git Commit

The workflow commits the manifest update automatically using a bot account (`github-actions[bot]`). The commit includes `[skip ci]` to prevent workflow loops. This ensures the repository always stays in sync with releases.

## Manual Release (Fallback)

If the automation fails, you can still publish manually:

1. **Build locally**:
```bash
npm run build
cd dist
zip -r ../mindful-browse-1.5.1.zip .
cd ..
```

2. **Firefox**: Upload via [https://addons.mozilla.org/developers/](https://addons.mozilla.org/developers/)
3. **Chrome**: Upload via [Chrome Web Store Developer Dashboard](https://chromewebstore.google.com/)