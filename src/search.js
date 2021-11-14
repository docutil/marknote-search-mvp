const { MeiliSearch } = require('meilisearch');
const { CONFIG } = require('./config');
const { $, cd } = require('zx');

const msClient = new MeiliSearch({
  host: CONFIG.meiliSearch.host,
});

async function searchInEngine({ indexName, keyword, pageIndex, pageSize }) {
  const index = msClient.index(indexName);
  return index.search(keyword, { limit: parseInt(pageSize), offset: parseInt((pageIndex - 1) * pageSize) });
}

async function downloadSiteSource(siteName, repoUrl) {
  try {
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

    console.log('pull latest commit, repoUrl =', repoUrl);
  } catch (err) {
    console.warn(err);
  }
}

async function updateIndex(indexName, commitMessage) {
  console.log(`upload new index to engine`, indexName, commitMessage);
  const siteConfig = CONFIG.sites[indexName];

  await downloadSiteSource(indexName, siteConfig.repoUrl);

  // TODO 进入到 docs 目录，walkdir，读出所有 .md 文件的数据，然后 push 到引擎中，id 使用文件名，并计算文件的 hash
}

exports.searchInEngine = searchInEngine;
exports.updateIndex = updateIndex;
