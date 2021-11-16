const EventEmitter = require('events');

const { updateIndex } = require('./mgr');
const { logger } = require('../util/logger');

class IndexMgrEvents extends EventEmitter {}
const indexMgrEvents = new IndexMgrEvents();

indexMgrEvents.on('update', ({ indexName, commitMessage }) => {
  logger.info(`request for update full-text search index data, name = %s`, indexName);
  updateIndex(indexName, commitMessage);
});

function updateIndexAsync({ indexName, commitMessage }) {
  indexMgrEvents.emit('update', { indexName, commitMessage });
}

module.exports = {
  updateIndexAsync,
};
