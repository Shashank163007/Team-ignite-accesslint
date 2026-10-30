# AccessLint

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Hackathon: Devf8rge 2026 (PS-09)](https://img.shields.io/badge/Hackathon-Devf8rge%202026%20(PS--09)-orange.svg)](https://devf8rge.hacktoberfest.com/)
[![Theme: Developer Productivity](https://img.shields.io/badge/Theme-Developer%20Productivity-brightgreen.svg)](#)

> **Automated accessibility regression linter for GitHub Pull Requests powered by Playwright and axe-core.**

---

## Overview

**AccessLint** is a CI/CD-native GitHub Action designed to catch web accessibility (a11y) regressions during Pull Requests *before* changes are merged to production.

Legacy codebases often suffer from accumulated accessibility violations, making team-wide a11y adoption difficult if automated tools fail builds on pre-existing issues. AccessLint solves this by enforcing differential a11y testing: it cleanly differentiates between existing legacy debt and newly introduced violations, empowering engineering teams to shift left on accessibility without grinding velocity to a halt.

### Key Features

- **Automated Live DOM Auditing**: Executes audits in real headless browser environments with [Playwright](https://playwright.dev/) and [`@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright), testing real rendered markup and styles rather than static code abstractions.
- **Comprehensive Keyboard Navigation Checks**: Goes beyond standard axe rules by testing keyboard focus states, checking for visible focus indicators, validating logical tab order, and detecting focus traps.
- **Zero-False-Positive Branch Comparison**: Employs deterministic issue fingerprints (`route::rule::element`) to compare PR branch findings against base branch baselines, isolating newly introduced regressions from legacy technical debt.
- **Sticky, Idempotent GitHub PR Comments**: Posts clear, non-duplicative PR reviews highlighting exact affected CSS selectors, impact severities, WCAG tags, and actionable code remediation guidance.
- **Native GitHub Actions Step Summary**: Generates rich Markdown summary tables in GitHub Actions job runs for immediate visibility into audit passes, warnings, and regression tallies.

---

## Architecture

The following ASCII diagram illustrates the end-to-end execution workflow of AccessLint within GitHub Actions:

```
+-----------------------------------------------------------------------------------+
|                              GitHub Pull Request Event                            |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                                 AccessLint Runner                                 |
|                                                                                   |
|  1. Spin up target frontend (start-command) or connect to target-url             |
|  2. Launch Headless Chromium via Playwright across specified routes               |
+-----------------------------------------------------------------------------------+
                                          |
                      +-------------------+-------------------+
                      |                                       |
                      v                                       v
+-------------------------------------------+ +-------------------------------------+
|        Live axe-core Scan Engine          | |       Keyboard Navigation Checks    |
| - Color contrast & ARIA roles             | | - Visible focus indicator checks    |
| - Missing form labels & alt texts         | | - Tab order flow validation         |
| - Heading hierarchy & semantic tags       | | - Keyboard trap detection           |
+-------------------------------------------+ +-------------------------------------+
                      |                                       |
                      +-------------------+-------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                              Baseline Diffing Engine                              |
|                                                                                   |
|  - Computes deterministic fingerprints: (route :: rule :: element)                |
|  - Filters out pre-existing issues (from base-scan-path)                          |
|  - Isolates NEW regressions introduced in this Pull Request                       |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                              Reporting & Notifications                            |
|                                                                                   |
|  [ Sticky PR Comment ]              [ GitHub Actions Summary ]    [ Build Status ]|
|  - Selective update or post         - High-level metrics matrix   - Exit 1 if new |
|  - Selector & code remediation      - Issue breakdown by impact     issues & fail |
+-----------------------------------------------------------------------------------+
```

---

## Quickstart / Usage

Add AccessLint to your repository by creating a workflow file under `.github/workflows/accesslint.yml`:

```yaml
name: Accessibility Linting

on:
  pull_request:
    branches: [main, develop]

jobs:
  accesslint:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write #   Required for posting sticky PR comments

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install chromium --with-deps

      - name: Run AccessLint
        uses: Shashank163007/Team-ignite-accesslint@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          target-url: 'http://localhost:3000'
          start-command: 'npm run start'
          routes: '/,/about,/contact'
          fail-on-new: 'true'
```


---

## Action Inputs & Outputs

### Inputs

| Input | Description | Required | Default |
| :--- | :--- | :---: | :---: |
| `github-token` | GitHub token for authenticating API requests and posting PR comments | **Yes** | `${{ github.token }}` |
| `target-url` | Target frontend base URL (e.g. `http://localhost:3000`) | No | `""` |
| `start-command` | Command to build or serve the frontend locally before scanning | No | `""` |
| `working-directory`| Working directory where the target application resides | No | `.` |
| `routes` | Comma-separated list of application routes to audit | No | `/` |
| `base-scan-path` | Path to a pre-computed base branch scan JSON artifact for diffing | No | `""` |
| `fail-on-new` | Whether to fail CI when new accessibility regressions are found | No | `'true'` |

### Outputs

| Output | Description |
| :--- | :--- |
| `new-issues-count` | Total count of newly introduced accessibility regressions. |
| `total-issues-count` | Total accessibility violations identified on the branch. |

---

## Local Setup & Testing

To run and test AccessLint locally:

### 1. Clone the repository
```bash
git clone https://github.com/Shashank163007/Team-ignite-accesslint.git
cd Team-ignite-accesslint
```

### 2. Install dependencies
```bash
npm install
```

### 3. Install Playwright browser binaries
```bash
npx playwright install chromium
```

### 4. Run tests
Execute the local test suite:
```bash
npm test
```

### 5. Test scanning locally
You can test the scanning pipeline directly using Node.js:
```bash
node src/action/index.js
```
*(Ensure relevant environment variables such as `INPUT_TARGET_URL` or `INPUT_START_COMMAND` are supplied if testing in standalone mode).*

---

## Team Ignite Credits

Developed with pride for **Devf8rge x Hacktoberfest Hack Day 2026 (PS-09)** by **Team Ignite**:

- **Shashank** — S1: GitHub Action & Integration Lead
- **Pratyaksh** — S2: Browser Automation & Scanning Lead
- **Mohammed** — M1: Accessibility Checks & Test Fixtures
- **Chathan** — M2: Comparison & Reporting Developer

---

## License

This project is licensed under the [MIT License](LICENSE).
