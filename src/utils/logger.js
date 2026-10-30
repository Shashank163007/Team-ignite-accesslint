const core = require('@actions/core');

const logger = {
  info: (message, meta) => {
    const formatted = meta ? `${message} ${JSON.stringify(meta)}` : message;
    core.info(`[AccessLint] ${formatted}`);
  },
  warn: (message, meta) => {
    const formatted = meta ? `${message} ${JSON.stringify(meta)}` : message;
    core.warning(`[AccessLint] ${formatted}`);
  },
  error: (message, error) => {
    let formatted = message;
    if (error) {
      formatted += error.stack ? `\n${error.stack}` : ` - ${error.message || error}`;
    }
    core.error(`[AccessLint] ${formatted}`);
  },
  debug: (message, meta) => {
    const formatted = meta ? `${message} ${JSON.stringify(meta)}` : message;
    core.debug(`[AccessLint] ${formatted}`);
  },
  group: (title) => {
    core.startGroup(`[AccessLint] ${title}`);
  },
  endGroup: () => {
    core.endGroup();
  }
};

module.exports = {
  logger
};