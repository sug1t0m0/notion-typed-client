import * as fs from 'node:fs';
import * as path from 'node:path';
import type { NotionTypedConfig } from '../types';

export class ConfigLoader {
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || path.resolve(process.cwd(), 'notion-typed.config.ts');
  }

  async load(): Promise<NotionTypedConfig> {
    if (!fs.existsSync(this.configPath)) {
      throw new Error(`Config file not found: ${this.configPath}`);
    }

    // TypeScriptファイルを動的にインポート
    try {
      // ts-nodeを使用してTypeScriptファイルを直接読み込む
      require('ts-node/register');

      // キャッシュをクリアして最新の設定を読み込む
      delete require.cache[require.resolve(this.configPath)];

      const configModule = require(this.configPath);
      const config = configModule.default || configModule;

      this.validateConfig(config);
      return config;
    } catch (error) {
      throw new Error(
        `Failed to load config: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateConfig(config: any): asserts config is NotionTypedConfig {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be an object');
    }

    if (!Array.isArray(config.databases)) {
      throw new Error('Config must have a databases array');
    }

    if (!config.output || typeof config.output !== 'object') {
      throw new Error('Config must have an output object');
    }

    if (!config.output.path || typeof config.output.path !== 'string') {
      throw new Error('Config output must have a path string');
    }

    for (const db of config.databases) {
      this.validateDatabase(db);
    }
  }

  private validateDatabase(db: any): void {
    if (!db || typeof db !== 'object') {
      throw new Error('Database config must be an object');
    }

    if (!db.name || typeof db.name !== 'string') {
      throw new Error('Database must have a name string');
    }

    if (!db.displayName || typeof db.displayName !== 'string') {
      throw new Error('Database must have a displayName string');
    }

    if (!db.notionName || typeof db.notionName !== 'string') {
      throw new Error('Database must have a notionName string');
    }

    if (!Array.isArray(db.properties)) {
      throw new Error(`Database ${db.name} must have a properties array`);
    }

    for (const prop of db.properties) {
      this.validateProperty(prop, db.name);
    }
  }

  private validateProperty(prop: any, dbName: string): void {
    if (!prop || typeof prop !== 'object') {
      throw new Error(`Property in database ${dbName} must be an object`);
    }

    if (!prop.name || typeof prop.name !== 'string') {
      throw new Error(`Property in database ${dbName} must have a name string`);
    }

    if (!prop.displayName || typeof prop.displayName !== 'string') {
      throw new Error(`Property ${prop.name} in database ${dbName} must have a displayName string`);
    }

    if (!prop.notionName || typeof prop.notionName !== 'string') {
      throw new Error(`Property ${prop.name} in database ${dbName} must have a notionName string`);
    }

    if (prop.type !== null && prop.type !== undefined && typeof prop.type !== 'string') {
      throw new Error(
        `Property ${prop.name} in database ${dbName} must have a type string or null`
      );
    }
  }

  getConfigPath(): string {
    return this.configPath;
  }
}
