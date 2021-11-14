const express = require('express');

const { startUpdateIndex } = require('./uploader');
const { CONFIG } = require('./config');
const { searchInEngine } = require('./search');

const app = express();
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

  startUpdateIndex({ indexName, commitMessage: {} });
  res.json({ status: 'start-update-index' });
});

app.listen(CONFIG.port, () => {
  console.log(`Host at http://localhost:${CONFIG.port}`);
});
