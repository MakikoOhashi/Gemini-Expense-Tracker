import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'folders.json');

class ConfigManager {
  constructor() {
    this.ensureConfigDir();
  }

  ensureConfigDir() {
    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const data = fs.readFileSync(CONFIG_PATH, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Config file read error:', error);
    }
    return {};
  }

  saveConfig(config) {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      console.error('Config file save error:', error);
      return false;
    }
  }

  getRootFolderId() {
    const config = this.loadConfig();
    return config.rootFolderId;
  }

  setRootFolderId(folderId) {
    const config = this.loadConfig();
    config.rootFolderId = folderId;
    return this.saveConfig(config);
  }

  getYearFolder(year) {
    const config = this.loadConfig();
    return config.yearFolders?.[year];
  }

  setYearFolder(year, folderId) {
    const config = this.loadConfig();
    if (!config.yearFolders) {
      config.yearFolders = {};
    }
    config.yearFolders[year] = folderId;
    return this.saveConfig(config);
  }

  getReceiptsFolder(year) {
    const config = this.loadConfig();
    return config.receiptsFolders?.[year];
  }

  setReceiptsFolder(year, folderId) {
    const config = this.loadConfig();
    if (!config.receiptsFolders) {
      config.receiptsFolders = {};
    }
    config.receiptsFolders[year] = folderId;
    return this.saveConfig(config);
  }

  getMonthlyFolder(year, month) {
    const config = this.loadConfig();
    const yearKey = `${year}_${month}`;
    return config.monthlyFolders?.[yearKey];
  }

  setMonthlyFolder(year, month, folderId) {
    const config = this.loadConfig();
    if (!config.monthlyFolders) {
      config.monthlyFolders = {};
    }
    const yearKey = `${year}_${month}`;
    config.monthlyFolders[yearKey] = folderId;
    return this.saveConfig(config);
  }

  getSpreadsheetId(year) {
    const config = this.loadConfig();
    return config.spreadsheets?.[year];
  }

  setSpreadsheetId(year, spreadsheetId) {
    const config = this.loadConfig();
    if (!config.spreadsheets) {
      config.spreadsheets = {};
    }
    config.spreadsheets[year] = spreadsheetId;
    return this.saveConfig(config);
  }

  getAllConfig() {
    return this.loadConfig();
  }
}

export const configManager = new ConfigManager();
