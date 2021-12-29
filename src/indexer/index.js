import { searchInEngine, checkHealth, updateIndex } from './mgr';

function updateIndexAsync({ indexName, commitMessage }) {
  updateIndex(indexName, commitMessage);
}

module.exports = {
  updateIndexAsync,
  searchInEngine,
  checkHealth,
};
