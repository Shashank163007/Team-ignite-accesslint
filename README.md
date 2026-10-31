# AccessLint

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![AccessLint CI](https://github.com/Shashank163007/Team-ignite-accesslint/actions/workflows/accesslint.yml/badge.svg)](https://github.com/Shashank163007/Team-ignite-accesslint/actions/workflows/accesslint.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-tested-2EAD33.svg?logo=playwright&logoColor=white)](https://playwright.dev/)
[![axe-core](https://img.shields.io/badge/axe--core-4.10-blue.svg)](https://github.com/dequelabs/axe-core)
[![Hackathon: Devf8rge 2026 (PS-09)](https://img.shields.io/badge/Hackathon-Devf8rge%202026%20(PS--09)-orange.svg)](https://devf8rge.hacktoberfest.com/)

> **Zero-config GitHub Action catching accessibility regressions in CI before they hit production.**

---

## 🌟 Live Demos & Links

- 🚀 **Live Demo Pull Request**: [PR #5 (AccessLint Regression Audit in Action)](https://github.com/Shashank163007/Team-ignite-accesslint/pull/5)
- 🌐 **Live Hosted Visual Preview**: [team-ignite-accesslint.vercel.app](https://team-ignite-accesslint.vercel.app)
- 📦 **GitHub Marketplace Action**: `Shashank163007/Team-ignite-accesslint@main`

---

## 💡 Why AccessLint?

### The Problem With Static Linters
Traditional AST and static analysis linters (such as ESLint JSX a11y plugins) operate on raw source text before compilation. As a result, they:
- **Miss client-side hydration** and real DOM tree modifications created by modern JavaScript frameworks.
- **Fail to compute dynamic CSS variables**, pseudo-classes (`:focus`, `:focus-visible`), and layered background colors, making real color contrast calculations impossible.
- **Cannot test dynamic interactions**, such as keyboard focus traps in modal dialogs, tab sequence order, and focus restoration.

### The Problem With Traditional Accessibility Audits
Running standard accessibility test suites or full-page audits against existing production code often leads to **alert fatigue**:
- Legacy codebases often contain dozens or hundreds of pre-existing violations.
- A single new pull request triggers a flood of legacy errors, causing teams to ignore the report or disable the CI check entirely.

### The AccessLint Solution
AccessLint provides **zero-config differential accessibility scanning**:
1. **Live Headless Browser Auditing**: Tests real rendered DOM nodes with Playwright and `@axe-core/playwright`.
2. **Synthetic Keyboard Traversal**: Simulates genuine Tab and Shift+Tab keypresses to detect focus traps, missing focus indicators, and untabbable interactive controls.
3. **Zero-False-Positive Fingerprinting**: Uses deterministic issue fingerprints (`route::rule::element`) to diff current PR findings against the base branch baseline.
4. **Actionable PR Feedback**: Non-blocking on pre-existing debt; fails CI *only* when new accessibility regressions are introduced, while posting sticky, idempotent Markdown reviews directly on the PR.

---

## 🏗️ Architecture & Workflow

```mermaid
flowchart TD
    A[Pull Request Event] --> B[AccessLint Runner]
    B --> C[Launch Headless Chromium via Playwright]
    C --> D[Navigate to Target Routes & Fixtures]
    D --> E[Live axe-core Scan Engine]
    D --> F[Synthetic Keyboard Tab Traversal]
    E --> G[WCAG Violations: Contrast, Labels, ARIA]
    F --> H[Keyboard Checks: Focus Indicators, Traps, Reachability]
    G --> I[Deterministic Issue Fingerprinting: route::rule::element]
    H --> I
    I --> J[Differential Comparison Engine]
    K[Base Branch Scan Baseline] --> J
    J --> L{New Regressions Detected?}
    L -- Yes --> M[Fail CI / Exit 1 (if fail-on-new: true)]
    L -- No --> N[Pass CI / Exit 0]
    M --> O[Post or Update Sticky PR Comment]
    N --> O
    O --> P[Emit GitHub Actions Job Step Summary]
```

### Text Flow Diagram
```
+-----------------------------------------------------------------------------------+
|                              GitHub Pull Request Event                            |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                           AccessLint Execution Engine                             |
|                                                                                   |
|  - Launches Headless Chromium via Playwright                                     |
|  - Resolves target routes and loads rendered application pages                    |
+-----------------------------------------------------------------------------------+
                                          |
                      +-------------------+-------------------+
                      |                                       |
                      v                                       v
+-------------------------------------------+ +-------------------------------------+
|         Live axe-core Auditing            | |    Synthetic Keyboard Navigation    |
| - Color contrast with computed styles     | | - Visible :focus-visible indicators |
| - Form controls & label associations      | | - Logical Tab sequence validation   |
| - ARIA roles, states, and semantic tags   | | - Keyboard focus trap detection     |
+-------------------------------------------+ +-------------------------------------+
                      |                                       |
                      +-------------------+-------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                  Deterministic Issue Fingerprinting & Baseline Diff               |
|                                                                                   |
|  - Encodes findings: (route :: rule :: element)                                   |
|  - Compares PR branch issues against pre-existing base branch baseline            |
|  - Separates new regressions from existing legacy debt                            |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                                 Reporting Pipeline                                |
|                                                                                   |
|  [ Sticky PR Review Comment ]       [ GitHub Actions Summary ]    [ Status Check ]|
|  - Idempotent update via marker     - Rich Markdown metrics matrix - Enforces pass|
|  - Code fixes & CSS selectors       - Issue counts by severity       or failure   |
+-----------------------------------------------------------------------------------+
```

---

## ⚡ Quickstart / Usage

Add AccessLint to your repository by creating `.github/workflows/accesslint.yml`:

```yaml
name: Accessibility Linting

on:
  pull_request:
    branches: [main, develop]
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write # Required for sticky PR review comments

jobs:
  accesslint:
    runs-on: ubuntu-latest

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
          routes: '/,/about,/pricing'
          fail-on-new: 'true'
```

---

## ⚙️ Configuration & Action Reference

### Action Inputs

| Input | Description | Required | Default |
| :--- | :--- | :---: | :---: |
| `github-token` | GitHub token for authenticating API requests and updating PR comments | **Yes** | `${{ github.token }}` |
| `target-url` | Target frontend base URL (e.g., `http://localhost:3000`) | No | `""` |
| `start-command` | Command to build or serve the application locally before auditing | No | `""` |
| `working-directory` | Working directory where the target application resides | No | `.` |
| `routes` | Comma-separated list of application routes to audit | No | `/` |
| `base-scan-path` | Path to pre-computed base branch scan JSON artifact for differential diffing | No | `""` |
| `fail-on-new` | Whether to fail CI when newly introduced accessibility regressions are detected | No | `'true'` |

### Action Outputs

| Output | Description |
| :--- | :--- |
| `new-issues-count` | Total count of newly introduced accessibility regressions. |
| `total-issues-count` | Total accessibility violations identified on the PR branch. |

### Reporting Formats

1. **Sticky PR Comment**: Posts a clean, single comment per pull request with a hidden identifier `<!-- accesslint-report -->`. On subsequent commits, AccessLint edits the existing comment instead of creating noisy thread spam.
2. **GitHub Actions Step Summary**: Appends rich GitHub-flavored markdown tables to the workflow run summary UI showing issue breakdowns by severity (Critical, Serious, Moderate, Minor).

---

## 💻 Local Development & Testing

You can run and test AccessLint locally without pushing to GitHub:

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

### 4. Run the end-to-end verification pipeline
Audit all built-in test fixtures, run live DOM checks, execute keyboard navigation sweeps, and compute baseline diffs:
```bash
npm test
# or
node tests/verify-pipeline.js
```

### 5. View the visual demo artifact
Open the self-contained HTML demo preview:
```bash
npm run preview
# or open directly in your browser:
# Windows: start tests/demo-preview.html
# macOS:   open tests/demo-preview.html
# Linux:   xdg-open tests/demo-preview.html
```

---

## 👥 Team Ignite Credits

Developed with pride for **Devf8rge x Hacktoberfest Hack Day 2026 (PS-09)** by **Team Ignite**:

- **Shashank V** — Lead / Action & Orchestration
- **Pratyaksh** — Scanner Engine
- **Mohammed** — Accessibility Checks & Fixtures
- **Chathan** — Comparison & Reporting

---

## 📜 Community & Governance

- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
