const express = require('express');

const { CONFIG } = require('./util/config');
const { logger } = require('./util/logger');
const { updateIndexAsync, searchInEngine, checkHealth } = require('./indexmgr');

const app = express();

app.use('/api/v1/status', async (req, res) => {
  const isEngineOk = await checkHealth();
  if (isEngineOk) {
    res.json({ message: 'ok' });
    return;
  }

  res.json({ error: true, message: 'engine is down' });
});

app.use('/api/v1/:site/search', async (req, res) => {
  const indexName = req.params.site;
  const { keyword, pageIndex, pageSize } = req.query;

  if (keyword && pageIndex && pageSize) {
    const searchResult = await searchInEngine({ indexName, keyword, pageIndex, pageSize });
    res.json(searchResult);
    return;
  }

  res.status(400).json({ error: true, message: 'missing parameter' });
});

app.use('/api/v1/:site/hook', (req, res) => {
  const indexName = req.params.site;

  updateIndexAsync({ indexName, commitMessage: {} });
  res.json({ message: 'start-update-index' });
});

app.listen(CONFIG.port, () => {
  logger.info(`Host at http://localhost:${CONFIG.port}`);
});
