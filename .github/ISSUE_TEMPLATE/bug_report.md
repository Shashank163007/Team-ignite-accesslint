---
name: Bug Report / False Positive
about: Report a runner error, unhandled exception, or false-positive accessibility violation.
title: "[BUG]: "
labels: ["bug", "triage"]
assignees: ""
---

### Problem Description
<!-- A clear and concise description of what the bug is or where the false positive occurred. -->

### Failure Category
- [ ] Runner crash / process exit error
- [ ] False positive accessibility violation
- [ ] False negative (accessibility violation missed)
- [ ] PR comment posting / sticky update failure
- [ ] Keyboard navigation / focus check error
- [ ] Other

### Environment & Setup
- **AccessLint Version / Commit SHA**: e.g., `@main` or `1.0.0`
- **Node.js Version**: e.g., `v20.x`
- **Operating System / Runner**: e.g., `ubuntu-latest`
- **Target Frontend Framework**: e.g., Next.js, Vite, Static HTML

### Steps to Reproduce
1. Configure workflow with inputs:
   ```yaml
   uses: Shashank163007/Team-ignite-accesslint@main
   with:
     target-url: "..."
     routes: "..."
   ```
2. Trigger pull request event.
3. Observe runner log or generated PR comment.

### Expected Behavior
<!-- What you expected to happen. -->

### Actual Behavior / Logs
<!-- Paste relevant terminal logs, stack traces, or generated Markdown comments. -->
```text

```

### Flagged Element & Rule Details (if applicable)
- **Axe Rule / Keyboard Rule ID**: e.g. `color-contrast`, `keyboard-unreachable`
- **DOM Selector Flagged**: e.g. `#main-nav > button`
- **HTML Snippet**:
  ```html

  ```

### Additional Context
<!-- Add any other context or screenshots about the problem here. -->

