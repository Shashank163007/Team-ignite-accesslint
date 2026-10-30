const github = require('@actions/github');
const { logger } = require('../utils/logger');

const STICKY_MARKER = '<!-- accesslint-report -->';

async function postOrUpdatePRComment({ token, body, prNumber: explicitPrNumber }) {
  if (!token) {
    logger.warn('No GitHub token provided. Skipping PR comment posting.');
    return;
  }

  const { context } = github;
  const prNumber =
    explicitPrNumber ||
    (context.payload.pull_request ? context.payload.pull_request.number : null) ||
    (context.payload.issue ? context.payload.issue.number : null);

  if (!prNumber) {
    logger.info('Not running in a Pull Request context. Skipping PR comment posting.');
    return;
  }

  const octokit = github.getOctokit(token);
  const { owner, repo } = context.repo;

  try {
    logger.info(`Checking existing comments on PR #${prNumber}...`);

    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
      per_page: 50
    });

    const existingComment = comments.find(
      (c) => c.body && c.body.includes(STICKY_MARKER)
    );

    const payloadBody = body.includes(STICKY_MARKER)
      ? body
      : `${STICKY_MARKER}\n${body}`;

    if (existingComment) {
      logger.info(`Updating existing AccessLint comment ID: ${existingComment.id}`);
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body: payloadBody
      });
      logger.info('Successfully updated existing PR comment.');
    } else {
      logger.info('No existing AccessLint comment found. Creating a new one...');
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: payloadBody
      });
      logger.info('Successfully created new PR comment.');
    }
  } catch (err) {
    logger.error(`Failed to post or update PR comment: ${err.message}`, err);
    logger.warn(
      'Ensure the workflow has "permissions: pull-requests: write" configured in its YAML definition.'
    );
  }
}

module.exports = {
  STICKY_MARKER,
  postOrUpdatePRComment
};