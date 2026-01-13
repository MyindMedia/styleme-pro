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

---

## 4. Set Up Dependabot for Automatic Dependency Updates

Dependabot automatically creates pull requests to keep your dependencies up-to-date and secure.

### Step 1: Create the Dependabot Configuration File

1. Go to your repository: https://github.com/MyindMedia/styleme-pro
2. Click **Add file** → **Create new file**
3. Name the file: `.github/dependabot.yml`
4. Paste the following content:

```yaml
# Dependabot configuration for FitCheck
# Docs: https://docs.github.com/en/code-security/dependabot/dependabot-version-updates

version: 2
updates:
  # NPM dependencies (main app)
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "America/New_York"
    open-pull-requests-limit: 10
    commit-message:
      prefix: "deps"
      include: "scope"
    labels:
      - "dependencies"
      - "npm"
    groups:
      # Group Expo-related updates together
      expo:
        patterns:
          - "expo*"
          - "@expo/*"
        update-types:
          - "minor"
          - "patch"
      # Group React Native updates together
      react-native:
        patterns:
          - "react-native*"
          - "@react-native/*"
          - "@react-navigation/*"
        update-types:
          - "minor"
          - "patch"
      # Group development dependencies
      dev-dependencies:
        dependency-type: "development"
        update-types:
          - "minor"
          - "patch"
      # Group TypeScript-related updates
      typescript:
        patterns:
          - "typescript"
          - "@types/*"
        update-types:
          - "minor"
          - "patch"
    ignore:
      # Ignore major version updates for critical packages (review manually)
      - dependency-name: "react"
        update-types: ["version-update:semver-major"]
      - dependency-name: "react-native"
        update-types: ["version-update:semver-major"]
      - dependency-name: "expo"
        update-types: ["version-update:semver-major"]

  # GitHub Actions updates
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    commit-message:
      prefix: "ci"
    labels:
      - "dependencies"
      - "github-actions"
```

5. Click **Commit changes** → **Commit directly to the main branch** → **Commit changes**

### Step 2: Enable Dependabot Security Updates

1. Go to your repository **Settings**
2. Click **Code security and analysis** in the left sidebar
3. Enable the following:

| Feature | Action |
|---------|--------|
| **Dependency graph** | ✅ Enable |
| **Dependabot alerts** | ✅ Enable |
| **Dependabot security updates** | ✅ Enable |

### Step 3: Configure Dependabot Alerts (Optional)

To receive notifications about security vulnerabilities:

1. Go to **Settings** → **Code security and analysis**
2. Under "Dependabot alerts", click **Configure**
3. Choose notification preferences (email, web, etc.)

### How Dependabot Works

| What It Does | Frequency |
|--------------|----------|
| Checks for npm package updates | Weekly (Mondays) |
| Checks for GitHub Actions updates | Weekly (Mondays) |
| Creates PRs for security vulnerabilities | Immediately |
| Groups related updates together | Automatic |

### Dependabot PR Workflow

When Dependabot creates a PR:

1. **Review the changelog** - Click "Release notes" in the PR description
2. **Check CI status** - Ensure all checks pass
3. **Merge or close** - Merge if safe, close if breaking changes detected

### Customizing Update Behavior

| Setting | Current Value | Options |
|---------|---------------|----------|
| Update frequency | Weekly | daily, weekly, monthly |
| Max open PRs | 10 | 1-100 |
| Auto-merge | Disabled | Can enable via GitHub Actions |
| Grouped updates | Enabled | Reduces PR noise |

---

## 5. Optional: Auto-Merge Dependabot PRs

To automatically merge low-risk Dependabot updates, add this workflow:

1. Create file: `.github/workflows/dependabot-auto-merge.yml`
2. Paste:

```yaml
name: Dependabot Auto-Merge

on: pull_request

permissions:
  contents: write
  pull-requests: write

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'
    steps:
      - name: Dependabot metadata
        id: metadata
        uses: dependabot/fetch-metadata@v2
        with:
          github-token: "${{ secrets.GITHUB_TOKEN }}"

      - name: Auto-merge patch and minor updates
        if: steps.metadata.outputs.update-type == 'version-update:semver-patch' || steps.metadata.outputs.update-type == 'version-update:semver-minor'
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This will auto-merge patch and minor updates after CI passes.

---

## Complete Setup Summary

After completing all sections, your repository will have:

| Feature | Status |
|---------|--------|
| Automated CI/CD | ✅ |
| Branch protection | ✅ |
| Dependabot version updates | ✅ |
| Dependabot security alerts | ✅ |
| Grouped dependency PRs | ✅ |
| Auto-merge (optional) | ⚙️ |

---

## 6. Set Up GitHub Projects Board

GitHub Projects helps you track features, bugs, and releases visually using a Kanban-style board.

### Step 1: Create the Project

1. Go to your GitHub profile: https://github.com/MyindMedia
2. Click the **Projects** tab
3. Click **New project**
4. Select **Board** template
5. Name it: `FitCheck Development`
6. Click **Create project**

### Step 2: Configure Columns

Set up these columns for your workflow:

| Column | Purpose |
|--------|----------|
| **Backlog** | Ideas and future work |
| **To Do** | Ready to be worked on |
| **In Progress** | Currently being developed |
| **In Review** | PRs awaiting review |
| **Done** | Completed items |

### Step 3: Link to Repository

1. In your project, click **Settings** (gear icon)
2. Under "Linked repositories", click **Link a repository**
3. Search for and select `styleme-pro`
4. Click **Link**

### Step 4: Configure Automation

Set up automatic status updates:

1. Click **Workflows** in project settings
2. Enable these automations:

| Workflow | Action |
|----------|--------|
| **Item added to project** | Set status to "Backlog" |
| **Item reopened** | Set status to "To Do" |
| **Pull request merged** | Set status to "Done" |
| **Item closed** | Set status to "Done" |

### Step 5: Add Custom Fields (Optional)

Enhance tracking with custom fields:

1. Click **+ New field** in the project
2. Add these fields:

| Field Name | Type | Options |
|------------|------|----------|
| **Priority** | Single select | Critical, High, Medium, Low |
| **Type** | Single select | Feature, Bug, Enhancement, Docs |
| **Sprint** | Iteration | 2-week cycles |
| **Estimate** | Number | Story points (1, 2, 3, 5, 8) |

### Step 6: Create Views

Organize work with different views:

| View | Configuration |
|------|---------------|
| **Board** | Group by Status |
| **Backlog** | Filter: Status = Backlog, Group by Priority |
| **Current Sprint** | Filter: Sprint = current, Group by Assignee |
| **Bug Tracker** | Filter: Type = Bug, Sort by Priority |

### Using the Project Board

**Adding Issues:**
1. From the project, click **+ Add item**
2. Type `#` to search repository issues
3. Select the issue to add

**Creating Issues from Project:**
1. Click **+ Add item** in any column
2. Type a title and press Enter
3. Click the item to convert to a full issue

**Tracking PRs:**
- PRs are automatically added when linked to issues
- Use "Fixes #123" in PR description to auto-link

---

## 7. Issue and PR Templates

Templates are included in the repository under `.github/`:

| Template | Location | Purpose |
|----------|----------|----------|
| Bug Report | `.github/ISSUE_TEMPLATE/bug_report.md` | Structured bug reports |
| Feature Request | `.github/ISSUE_TEMPLATE/feature_request.md` | New feature proposals |
| PR Template | `.github/pull_request_template.md` | Standardized PR descriptions |

These templates are automatically used when creating new issues or PRs.

---

## Complete Repository Setup Summary

After completing all sections, your repository will have:

| Feature | Status |
|---------|--------|
| CI/CD Pipeline | ✅ |
| Branch Protection | ✅ |
| Dependabot Updates | ✅ |
| Security Alerts | ✅ |
| Project Board | ✅ |
| Issue Templates | ✅ |
| PR Template | ✅ |
| Auto-merge (optional) | ⚙️ |
