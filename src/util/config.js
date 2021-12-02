import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

const DEFAULT_CONFIG_FILE = 'marknote-search.config.yml';

const CONFIG_FILE = path.resolve(process.env.MS_CONFIG_FILE || (process.cwd(), DEFAULT_CONFIG_FILE));

export const CONFIG = YAML.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
