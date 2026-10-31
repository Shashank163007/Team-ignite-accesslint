# Contributing to AccessLint

Thank you for your interest in contributing to **AccessLint**! We welcome contributions from developers of all skill levels to help make the web accessible to everyone.

Please review this guide before submitting issues or pull requests.

---

## 🧭 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to the project maintainers.

---

## 🌿 Branching Strategy

We follow a structured branch-naming convention:

- `feat/<feature-name>`: New scanner features, audit rules, or reporting capabilities.
- `fix/<bug-description>`: Bug fixes, false-positive corrections, or runner stability patches.
- `docs/<topic>`: Documentation enhancements, guide updates, or code comment fixes.
- `test/<test-scope>`: New test fixtures, keyboard navigation tests, or verification scripts.
- `chore/<task>`: Dependency updates, CI workflow changes, or repository maintenance.

Example:
```bash
git checkout -b feat/keyboard-trap-enhancement
```

---

## 📝 Commit Message Standards

AccessLint strictly follows the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short description>
```

### Supported Types:
- `feat`: A new feature or check (e.g., `feat(keyboard): detect modal focus trap with Escape key handler`)
- `fix`: A bug fix or false-positive adjustment (e.g., `fix(scanner): resolve module warning in browser.js`)
- `docs`: Documentation updates (e.g., `docs(readme): add live demo links and badge`)
- `test`: Adding or modifying tests and fixtures (e.g., `test(fixtures): add tab-order test fixture`)
- `refactor`: Code reorganization without altering behavior (e.g., `refactor(comparison): optimize fingerprint index map`)
- `chore`: Maintenance tasks or dependency updates (e.g., `chore(deps): update playwright to 1.48.0`)

---

## 🛠️ Local Development & Testing Workflow

### 1. Prerequisites
- **Node.js**: `>= 18.0.0` (LTS recommended)
- **npm**: `>= 9.0.0`

### 2. Setup
```bash
# Clone the repository
git clone https://github.com/Shashank163007/Team-ignite-accesslint.git
cd Team-ignite-accesslint

# Install dependencies
npm install

# Install Playwright browser engines
npx playwright install chromium
```

### 3. Verification & Testing
Before committing any changes, verify the entire live DOM audit pipeline and baseline comparison engine locally:

```bash
# Run automated verification suite
npm test
# or
node tests/verify-pipeline.js
```

All 4 test fixtures (`bad-contrast.html`, `good-page.html`, `missing-label.html`, `tab-order.html`) should be audited with zero runtime errors.

### 4. Visual Verification
Open and inspect the local preview artifact to verify formatting and visual presentation:
```bash
npm run preview
```

---

## 🚀 Submitting a Pull Request

1. Fork the repository and create your branch from `main`.
2. Implement your changes adhering to existing code conventions.
3. If adding a new accessibility check, include:
   - A representative test fixture in `tests/fixtures/`.
   - Appropriate WCAG rule mappings.
   - Actionable suggested code fix text.
4. Verify that all tests pass cleanly (`npm test`).
5. Push your branch to your fork and submit a Pull Request to `main`.
6. Fill out the pull request template completely.

---

## ✅ Pull Request Checklist

Before requesting review, ensure your PR meets these criteria:

- [ ] Code follows existing JavaScript styling and CommonJS module patterns.
- [ ] No unhandled module warnings (e.g., `MODULE_TYPELESS_PACKAGE_JSON`).
- [ ] Automated verification passes cleanly via `node tests/verify-pipeline.js`.
- [ ] All new accessibility checks output deterministic fingerprints (`route::rule::element`).
- [ ] Documentation (`README.md`, comments) is updated where applicable.
- [ ] Commit history conforms to Conventional Commits.

---

## 💬 Getting Help

If you run into issues or have questions, please feel free to open a [GitHub Issue](https://github.com/Shashank163007/Team-ignite-accesslint/issues) or reach out to the Team Ignite maintainers.
