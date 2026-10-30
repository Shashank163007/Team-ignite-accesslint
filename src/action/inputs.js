const core = require('@actions/core');

function getActionInputs() {
  const githubToken =
    core.getInput('github-token', { required: false }) ||
    process.env.GITHUB_TOKEN ||
    '';
  const targetUrl = core.getInput('target-url') || '';
  const startCommand = core.getInput('start-command') || '';
  const workingDirectory = core.getInput('working-directory') || '.';
  const rawRoutes = core.getInput('routes') || '/';
  const baseScanPath = core.getInput('base-scan-path') || '';

  const failOnNewRaw = core.getInput('fail-on-new');
  let failOnNew = true;
  if (failOnNewRaw !== '') {
    try {
      failOnNew = core.getBooleanInput('fail-on-new');
    } catch {
      failOnNew = true;
    }
  }

  const routes = rawRoutes
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r.length > 0);

  return {
    githubToken,
    targetUrl,
    startCommand,
    workingDirectory,
    routes: routes.length > 0 ? routes : ['/'],
    baseScanPath,
    failOnNew
  };
}

module.exports = {
  getActionInputs
};