const fs = require('fs/promises');
const path = require('path');

const { $, cd } = require('zx');
const { MeiliSearch } = require('meilisearch');
const { trimStart, uniqueId } = require('lodash');
const checksum = require('checksum');
const glob = require('glob');

const { CONFIG } = require('../util/config');
const { logger } = require('../util/logger');

const msClient = new MeiliSearch({
  host: CONFIG.meiliSearch.host,
  apiKey: CONFIG.meiliSearch.masterKey,
});

exports.checkHealth = async function checkHealth() {
  return msClient.isHealthy();
};

exports.searchInEngine = async function searchInEngine({ indexName, keyword, pageIndex, pageSize }) {
  const index = msClient.index(indexName);
  return index.search(keyword, { limit: parseInt(pageSize), offset: parseInt((pageIndex - 1) * pageSize) });
};

async function downloadSiteSource(siteName, repoUrl) {
  logger.info('download repo, siteName = %s, repoUrl = %s', siteName, repoUrl);

  await $`pwd`;

  // 创建仓库根目录
  await $`mkdir -p ${CONFIG.repoRoot}`;
  await cd(CONFIG.repoRoot);

  // 测试目录是否已经存在，没有的情况下，执行 git clone
  await $`test -d ${siteName} || git clone ${repoUrl} ${siteName}`;

  // git pull
  if ((await $`test -d ${siteName} && test -d ${siteName}/.git`.exitCode) === 0) {
    await cd(`${CONFIG.repoRoot}/${siteName}`);
    await $`git pull`;
  }

  logger.info(`repo update to date`);
}

function getAllMarkdownFiles(docsRoot) {
  const _docsRoot = docsRoot.replaceAll(/\/+$/g, '');
  const pattern = `${_docsRoot}/**/*.md`;

  return new Promise((resolve, reject) => {
    glob(pattern, (err, files) => {
      if (err) {
        return reject(err);
      }

      return resolve(files);
    });
  });
}

async function readFileAndSplit(filePath) {
  const text = await fs.readFile(filePath, 'utf-8');
  return text
    .split('\n')
    .map(it => it.trim())
    .filter(it => it !== '');
}

exports.updateIndex = async function updateIndex(indexName, commitMessage) {
  const siteConfig = CONFIG.sites[indexName];

  try {
    await downloadSiteSource(indexName, siteConfig.repoUrl);
  } catch (err) {
    logger.error('failed to pull latest commit, %s', err);
    return;
  }

  const siteRepoRoot = path.join(CONFIG.repoRoot, indexName).replace('\\', '/');
  const dir = path.join(siteRepoRoot, siteConfig.docRoot).replace('\\', '/');
  const files = await getAllMarkdownFiles(dir);

  if (files.length === 0) {
    logger.info('no markdown file found, nothing to do');
    return;
  }

  logger.info('got markdown files, count = %i', files.length);

  const markdownFileMetadataList = files.map(file => {
    const pathFromRepoRoot = trimStart(file, siteRepoRoot);
    return {
      path: pathFromRepoRoot, // 相对文章网站的路径
      storePath: file, // 本机中的储存位置
      sha1Sum: checksum(file),
    };
  });

  logger.info(`start to generate index original data`);

  const generated = markdownFileMetadataList.map(async meta => {
    const lines = await readFileAndSplit(meta.storePath);
    return lines.map(line => {
      return {
        ...meta,
        line,
        id: uniqueId(indexName + '_'),
      };
    });
  });

  const data = await Promise.all(generated);
  const flattenData = data.flat(Infinity);

  logger.info('generated index base data, count = %i', flattenData.length);
  logger.info(`send to search engine`);

  const index = msClient.index(indexName);

  // TODO 优化，现在是先清空全部索引数据，再全新创建
  try {
    await index.deleteAllDocuments();
    logger.info('old index data removed');
  } catch (err) {
    logger.warn('failed to clean old index data, %s', err);
  }

  await index.addDocuments(flattenData);
  logger.info('new index data added');

  await configIndex(indexName);
  logger.info('index setting updated');

  logger.info('index updated');
};

async function configIndex(indexName) {
  const index = msClient.index(indexName);

  await index.resetSettings();
  await index.updateSettings({
    searchableAttributes: ['line'],
    displayedAttributes: ['line', 'path'],
  });
}
