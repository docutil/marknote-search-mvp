const YAML = require('yaml');
const path = require('path');
const fs = require('fs');

const CONFIG_FILE = path.resolve(process.env.MS_CONFIG_FILE || (process.cwd(), 'marknote-search.config.yml'));
const CONFIG = YAML.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));

exports.CONFIG = CONFIG;
