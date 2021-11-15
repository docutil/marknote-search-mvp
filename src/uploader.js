const EventEmitter = require('events');

const { updateIndex } = require('./search');
const { logger } = require('./util/logger');

class Uploader extends EventEmitter {}
const uploader = new Uploader();

uploader.on('update', ({ indexName, commitMessage }) => {
  logger.info(`request for update full-text search index data, name = %s`, indexName);
  updateIndex(indexName, commitMessage);
});

exports.startUpdateIndex = function ({ indexName, commitMessage }) {
  uploader.emit('update', { indexName, commitMessage });
};
