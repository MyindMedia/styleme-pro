# GitHub Repository Setup Guide

This guide walks you through setting up GitHub Actions CI/CD and branch protection for the FitCheck repository.

---

## 1. Enable GitHub Actions Workflow

The CI workflow file is ready but needs to be added manually due to GitHub permissions.

### Step 1: Create the Workflow File

1. Go to your repository: https://github.com/MyindMedia/styleme-pro
2. Click **Add file** → **Create new file**
3. Name the file: `.github/workflows/ci.yml`
4. Paste the following content:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Setup pnpm cache
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run ESLint
        run: pnpm lint

      - name: Run TypeScript type check
        run: pnpm check

  test:
    name: Run Tests
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Setup pnpm cache
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test
        env:
          NODE_ENV: test

  build-check:
    name: Build Check
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Setup pnpm cache
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build server
        run: pnpm build

      - name: Export Expo web build (check only)
        run: npx expo export --platform web --output-dir dist-web
        env:
          EXPO_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
          EXPO_PUBLIC_SUPABASE_ANON_KEY: placeholder-key
```

5. Click **Commit changes** → **Commit directly to the main branch** → **Commit changes**

### Step 2: Verify Workflow is Running

1. Go to the **Actions** tab in your repository
2. You should see the "CI" workflow
3. Click on it to see the run status

---

## 2. Set Up Branch Protection Rules

Branch protection ensures code quality by requiring checks to pass before merging.

### Steps:

1. Go to your repository: https://github.com/MyindMedia/styleme-pro
2. Click **Settings** (gear icon)
3. In the left sidebar, click **Branches** under "Code and automation"
4. Click **Add branch protection rule**

### Configure the Rule:

| Setting | Value |
|---------|-------|
| **Branch name pattern** | `main` |
| **Require a pull request before merging** | ✅ Checked |
| **Require approvals** | 1 (or more for teams) |
| **Require status checks to pass before merging** | ✅ Checked |
| **Require branches to be up to date before merging** | ✅ Checked |

### Add Required Status Checks:

After the CI workflow has run at least once, you can add these status checks:

1. In the "Require status checks to pass" section
2. Search for and add:
   - `Lint & Type Check`
   - `Run Tests`
   - `Build Check`

### Additional Recommended Settings:

| Setting | Recommendation |
|---------|----------------|
| **Require conversation resolution before merging** | ✅ Enable |
| **Do not allow bypassing the above settings** | ✅ Enable (for strict enforcement) |
| **Restrict who can push to matching branches** | Optional - limit to maintainers |

5. Click **Create** to save the rule

---

## 3. Verify Setup

### Test the CI Workflow:

1. Create a new branch: `git checkout -b test/ci-check`
2. Make a small change (e.g., add a comment)
3. Push and create a PR
4. Verify CI checks run automatically

### Test Branch Protection:

1. Try to push directly to `main` - should be blocked
2. Create a PR - should require approval and passing checks

---

## Troubleshooting

### CI Workflow Not Running

- Ensure the workflow file is in `.github/workflows/ci.yml`
- Check the Actions tab for any error messages
- Verify Actions are enabled in repository settings

### Status Checks Not Appearing

- The workflow must run at least once before status checks appear
- Make a small commit to trigger the workflow

### Permission Issues

- Ensure you have admin access to the repository
- Check Settings → Actions → General for permission settings

---

## Summary

After completing this setup, your repository will have:

| Feature | Status |
|---------|--------|
| Automated linting on every PR | ✅ |
| TypeScript type checking | ✅ |
| Automated tests | ✅ |
| Build verification | ✅ |
| Required PR reviews | ✅ |
| Protected main branch | ✅ |

This ensures code quality and prevents broken code from being merged.
