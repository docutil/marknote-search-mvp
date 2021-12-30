import fs from 'node:fs/promises';
import path from 'node:path';

import { $, cd } from 'zx';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { MeiliSearch } from 'meilisearch';
import { toString } from 'mdast-util-to-string';
import { trimStart, uniqueId } from 'lodash';
import checksum from 'checksum';
import { globby } from 'globby';

import { CONFIG } from '../util/config';
import { logger } from '../util/logger';

$.verbose = true;

function normalizePath(p) {
  return `${p || ''}`.replaceAll(/[\\/]+/g, '/').replaceAll(/[\\/]+$/g, '');
}

const msClient = new MeiliSearch({
  host: CONFIG.meiliSearch.host,
  apiKey: CONFIG.meiliSearch.masterKey,
});

export async function checkHealth() {
  return msClient.isHealthy();
}

export async function searchInEngine({ indexName, keyword, pageIndex, pageSize }) {
  const index = msClient.index(indexName);
  return index.search(keyword, { limit: parseInt(pageSize), offset: parseInt((pageIndex - 1) * pageSize) });
}

async function pullRepo(siteId, repoUrl, commitMessage) {
  logger.info('download repo, siteName = %s, repoUrl = %s', siteId, repoUrl);

  await $`pwd`;

  // 创建仓库根目录
  await $`mkdir -p ${CONFIG.repoRoot}`;
  await cd(CONFIG.repoRoot);

  // 构建网站的目录是否已经存在
  const checkSiteNameDir = await $`test -d ${siteId}`.exitCode;
  const repoDirExists = checkSiteNameDir === 0;

  if (repoDirExists) {
    const checkDotGitDir = await $`test -d ${siteId}/.git`.exitCode;
    const dotGitDirExists = checkDotGitDir === 0;
    if (dotGitDirExists) {
      cd(`${CONFIG.repoRoot}/${siteId}`);
      const updated = await $`git pull`.exitCode;

      if (updated === 0) {
        logger.info(`repo update to date`);
        return;
      }
    }

    // 没有 .git 目录或者 git pull 失败
    await $`rm -rf ${siteId}`;
    logger.info('remove dir to re-clone');
  }

  await $`git clone ${repoUrl} ${siteId}`;
  logger.info(`repo cloned`);
}

function getAllMdFiles(docsRoot) {
  return globby(`${docsRoot}/**/*.md`);
}

async function readMdBlocks(filePath) {
  const text = await fs.readFile(filePath, 'utf-8');

  // 从 markdown ast 中获取每个 block 块
  const tree = fromMarkdown(text);
  return tree.children?.map(block => toString(block).trim()).filter(it => it !== '');
}

async function configIndex(indexName) {
  const index = msClient.index(indexName);

  await index.resetSettings();
  await index.updateSettings({
    searchableAttributes: ['line'],
    displayedAttributes: ['line', 'path'],
  });
}

async function refreshIndex(siteId, commitMessage) {
  const siteConfig = CONFIG.sites[siteId];

  try {
    await pullRepo(siteId, siteConfig.repoUrl, commitMessage);
  } catch (err) {
    logger.error('failed to pull latest commit, %s', err);
    return;
  }

  const siteRepoRoot = normalizePath(path.join(CONFIG.repoRoot, siteId));
  const dir = normalizePath(path.join(siteRepoRoot, siteConfig.docRoot));
  const files = await getAllMdFiles(dir);
  logger.debug('get markdown files: %O', files);

  // 忽略以 _ 开头的 md 文件
  const filtered = files.filter(it => !it.startsWith('_'));

  if (filtered.length === 0) {
    logger.info('no markdown file found, nothing to do');
    return;
  }

  logger.info('got markdown files, count = %i', filtered.length);

  const markdownFileMetadataList = filtered.map(file => {
    return {
      path: trimStart(file, siteRepoRoot), // 相对文章网站的路径
      storePath: file, // 本机中的储存位置
      sha1Sum: checksum(file),
    };
  });

  logger.info(`start to generate index original data`);

  const generated = markdownFileMetadataList.map(async meta => {
    const lines = await readMdBlocks(meta.storePath);
    return lines.map(line => {
      return {
        ...meta,
        line,
        id: uniqueId(siteId + '_'),
      };
    });
  });

  const data = await Promise.all(generated);
  const flattenData = data.flat(Infinity);

  logger.info('generated index base data, count = %i', flattenData.length);
  logger.info(`send to search engine`);

  const index = msClient.index(siteId);

  // TODO 优化，现在是先清空全部索引数据，再全新创建
  try {
    await index.deleteAllDocuments();
    logger.debug('old index data removed');
  } catch (err) {
    logger.warn('failed to clean old index data, %s', err);
  }

  await index.addDocuments(flattenData);
  logger.debug('new index data added');

  await configIndex(siteId);
  logger.debug('index setting updated');

  logger.info('index updated');
}

const tasks = { list: [], running: false };

async function resolveTasks() {
  const { indexName, commitMessage } = tasks.list.pop();

  logger.debug('resolveTasks, start new task. indexName = %s', indexName);
  tasks.running = true;
  await refreshIndex(indexName, commitMessage);

  if (tasks.list.length === 0) {
    logger.debug('tasks queue is empty, exit resolveTasks and mark running to false');
    tasks.running = false;
    return;
  }

  return resolveTasks();
}

export function updateIndex(indexName, commitMessage) {
  tasks.list.push({ indexName, commitMessage });
  logger.debug('task queue is %d length', tasks.list.length);

  if (!tasks.running) {
    resolveTasks();
  }
}
