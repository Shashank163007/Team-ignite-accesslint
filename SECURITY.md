# Security Policy

The AccessLint team takes the security of our automated testing tools, GitHub Actions runners, and downstream consumers seriously.

---

## 🛡️ Supported Versions

We actively provide security patches and updates for the following versions:

| Version | Supported | Status |
| :--- | :---: | :--- |
| `1.x` | :white_check_mark: | Currently active release |
| `< 1.0` | :x: | Deprecated / pre-release |

---

## 🚨 Reporting a Vulnerability

If you discover a potential security vulnerability within AccessLint or its dependencies, please report it through **responsible disclosure**.

### How to Report
- **Email**: Send details of the vulnerability to `shashank.v163007@gmail.com` with the subject line `[SECURITY] AccessLint Vulnerability Report`.
- **GitHub Private Advisory**: Alternatively, create a [Private Vulnerability Report](https://github.com/Shashank163007/Team-ignite-accesslint/security/advisories/new) via GitHub Security Advisories.

### What to Include
Please provide:
1. Description of the vulnerability and its potential impact.
2. Step-by-step reproduction instructions or a minimal proof of concept (PoC).
3. The affected component (`browser.js`, `axe-runner.js`, GitHub token handling, etc.).
4. Suggested remediation if available.

### Response Timeline
- **Initial Acknowledgment**: Within **48 hours** of receipt.
- **Triage & Status Update**: Within **5 business days**.
- **Fix & Public Advisory**: Coordinated release following validation of the patch.

Please do **not** open public GitHub issues or discussions for sensitive security disclosures.

---

## 🔒 Security Best Practices for GitHub Actions

AccessLint interacts with GitHub's REST API to post and update pull request comments. To minimize risk in CI workflows, adhere to the principle of least privilege:

### 1. Minimal Token Permissions
Never grant broad `write-all` permissions. Only grant the explicit scopes required for AccessLint:

```yaml
permissions:
  contents: read        # Read repository code and configuration
  pull-requests: write  # Post or update sticky review comment on PRs
```

### 2. Fork Pull Request Safety
When auditing pull requests submitted from public forks:
- Use GitHub's standard `pull_request` event (which runs with read-only repository permissions by default and cannot access write secrets).
- Avoid running arbitrary untrusted scripts from pull requests prior to AccessLint execution.

### 3. Isolated Browser Execution
AccessLint runs Playwright in headless Chromium within isolated sandbox boundaries, navigating only to designated target URLs and application routes. Ensure that target servers run in clean, throwaway CI container environments.
