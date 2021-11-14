const EventEmitter = require('events');
const { updateIndex } = require('./search');

class Uploader extends EventEmitter {}
const uploader = new Uploader();

uploader.on('update', ({ indexName, commitMessage }) => {
  updateIndex(indexName, commitMessage);
});

exports.startUpdateIndex = function ({ indexName, commitMessage }) {
  uploader.emit('update', { indexName, commitMessage });
};
