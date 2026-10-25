# AccessLint

AccessLint is a planned accessibility linter for open source frontend projects. The goal is to help developers find common accessibility problems and understand how to fix them.

This project is being developed for **PS-09: Accessibility Linter for OSS Frontends**. It is currently at the planning stage; implementation has not started, so there are no working features yet.

## The problem

Accessibility issues can make websites difficult or impossible for some people to use. They are easy to miss during development, especially when a team does not have a simple way to check for them. AccessLint aims to make common issues easier to spot and address.

## How AccessLint is intended to work

1. A developer provides a frontend project or opens a website to scan.
2. AccessLint examines the frontend code or the rendered page.
3. An accessibility testing engine, possibly `axe-core`, checks for issues it supports.
4. AccessLint presents findings with their location when available and a suggested fix.
5. The developer uses the report to improve the website.

The scanning approach and dependencies are still being decided, so this describes the plan rather than a finished workflow.

## Planned features

- Find images that are missing alternative text.
- Find form controls without accessible labels.
- Find buttons without accessible names.
- Detect color contrast issues where the selected checks support them.
- Show issue details, location when available, and suggestions for fixing problems.

## Proposed technology stack

- JavaScript and Node.js
- React and Vite
- npm
- `axe-core` for accessibility checks, subject to final integration

The stack may change as development progresses.

## How to run it

Coming soon. Implementation has not started, so setup and run instructions are not available yet.

## Testing plan

The project will be checked against the official **Devf8rge PS-09 test kit**. Additional testing will be planned as the scanning approach is implemented.

## Future improvements

- Decide how developers provide a project or website to scan.
- Improve the detail and usefulness of suggested fixes.
- Expand the set of detectable accessibility issues.
- Refine the report as the project is tested with real frontend projects.

## License

AccessLint is licensed under the MIT License. See [LICENSE](LICENSE).

## AI disclosure

Development assistance used: **[Coding assistants planned: OpenCode, Google Antigravity and OpenAI Codex. No closed AI API planned inside the product MVP.
]**.

AI APIs used: **[NVIDIA API ]**.
