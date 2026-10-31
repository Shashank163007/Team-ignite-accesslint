## Description
<!-- Provide a brief description of the changes introduced in this pull request. -->

## Type of Change
- [ ] 🚀 New feature (enhances accessibility check engine or reporting)
- [ ] 🐛 Bug fix (resolves an error, false positive, or runner crash)
- [ ] 📝 Documentation update
- [ ] 🧪 Testing & fixtures (adds or modifies HTML test fixtures)
- [ ] 🧹 Refactoring or maintenance

## Related Issue / Ticket
<!-- Link any related issues: e.g. Fixes #123 -->

## Verification & Testing
<!-- Describe how these changes were tested locally. -->
- [ ] Executed `npm test` / `node tests/verify-pipeline.js` locally with zero errors.
- [ ] Verified Playwright headless browser navigation and axe-core scan execution.
- [ ] Verified synthetic keyboard navigation (Tab traversal, focus indicators, trap checks).
- [ ] Verified deterministic diffing output (`route::rule::element`).
- [ ] Inspected visual demo report preview (`tests/demo-preview.html`).

## Checklist
- [ ] My code adheres to the existing CommonJS architecture and project styling.
- [ ] No extraneous warnings (e.g. `MODULE_TYPELESS_PACKAGE_JSON`) are emitted.
- [ ] Commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) format.
- [ ] Relevant documentation has been updated.
