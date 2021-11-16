const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const DEFAULT_CONFIG_FILE = 'marknote-search.config.yml';

const CONFIG_FILE = path.resolve(process.env.MS_CONFIG_FILE || (process.cwd(), DEFAULT_CONFIG_FILE));

const CONFIG = YAML.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));

exports.CONFIG = CONFIG;
