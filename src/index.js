import express from 'express';
import { CONFIG } from './util/config';
import { logger } from './util/logger';
import { updateIndexAsync, searchInEngine, checkHealth } from './indexmgr';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/v1/status', async (req, res) => {
  const isEngineOk = await checkHealth();
  if (isEngineOk) {
    res.json({ message: 'ok' });
    return;
  }

  res.json({ error: true, message: 'engine is down' });
});

app.get('/api/v1/:site/search', async (req, res) => {
  const indexName = req.params.site;
  const { keyword, pageIndex, pageSize } = req.query;

  if (keyword && pageIndex && pageSize) {
    const searchResult = await searchInEngine({ indexName, keyword, pageIndex, pageSize });
    res.json(searchResult);
    return;
  }

  res.status(400).json({ error: true, message: 'missing parameter' });
});

app.post('/api/v1/:site/hook', (req, res) => {
  const indexName = req.params.site;
  const signature = req.headers['X-Hub-Signature'.toLowerCase()];
  const signature256 = req.headers['X-Hub-Signature-256'.toLowerCase()];

  logger.info(`get hook callback, signature=${signature}, signature256=${signature256}`);
  logger.info(`get hook callback data: ${JSON.stringify(req.body, null, 2)}`);

  updateIndexAsync({ indexName, commitMessage: { id: req.body?.after } });
  res.json({ message: 'start-update-index' });
});

app.listen(CONFIG.port, () => {
  logger.info(`Host at http://localhost:${CONFIG.port}`);
  logger.info(`Work dir: ${process.cwd()}`);
});
