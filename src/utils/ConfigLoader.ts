import * as fs from 'node:fs';
import * as path from 'node:path';
import type { NotionTypedConfig } from '../types';

export class ConfigLoader {
  private configPath: string;

  constructor(configPath?: string) {
    // Try multiple config file extensions
    if (configPath) {
      this.configPath = configPath;
    } else {
      const basePath = path.resolve(process.cwd(), 'notion-typed.config');
      // Prefer .js for faster loading, fallback to .ts
      this.configPath = fs.existsSync(`${basePath}.js`) ? `${basePath}.js` : `${basePath}.ts`;
    }
  }

  async load(): Promise<NotionTypedConfig> {
    if (!fs.existsSync(this.configPath)) {
      throw new Error(`Config file not found: ${this.configPath}`);
    }

    try {
      const config = await this.loadConfigFile(this.configPath);
      this.validateConfig(config);
      return config;
    } catch (error) {
      throw new Error(
        `Failed to load config: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async loadConfigFile(configPath: string): Promise<NotionTypedConfig> {
    const ext = path.extname(configPath);

    // For .js files, use standard require
    if (ext === '.js') {
      // Clear cache for hot reloading
      delete require.cache[require.resolve(configPath)];
      const configModule = require(configPath);
      return this.extractConfig(configModule);
    }

    // For .ts files, try modern approaches with fallbacks
    if (ext === '.ts') {
      const configModule = await this.loadTypeScriptConfig(configPath);
      return this.extractConfig(configModule);
    }

    throw new Error(`Unsupported config file extension: ${ext}`);
  }

  private extractConfig(configModule: unknown): NotionTypedConfig {
    // Handle various export patterns
    if (configModule && typeof configModule === 'object') {
      // ESM default export or CommonJS with __esModule
      if ('default' in configModule) {
        return configModule.default as NotionTypedConfig;
      }
      // Direct CommonJS export
      if ('databases' in configModule && 'output' in configModule) {
        return configModule as NotionTypedConfig;
      }
    }

    // Fallback for other cases
    return configModule as NotionTypedConfig;
  }

  private async loadTypeScriptConfig(configPath: string): Promise<unknown> {
    // Method 1: Try jiti (fastest, zero-config)
    try {
      const jiti = require('jiti')(__filename, {
        interopDefault: true,
        esmResolve: true,
        cache: false, // Disable cache to avoid test interference
      });
      return jiti(configPath);
    } catch (jitiError: unknown) {
      const jitiMessage = jitiError instanceof Error ? jitiError.message : String(jitiError);
      console.warn('jiti failed, trying ts-node fallback:', jitiMessage);

      // Method 2: Fallback to ts-node
      try {
        require('ts-node/register');
        // Clear all cache entries that might contain the config path
        Object.keys(require.cache).forEach((key) => {
          if (key.includes(configPath) || key.endsWith(path.basename(configPath))) {
            delete require.cache[key];
          }
        });
        const configModule = require(configPath);
        return configModule;
      } catch (tsNodeError: unknown) {
        const tsNodeMessage =
          tsNodeError instanceof Error ? tsNodeError.message : String(tsNodeError);

        // Method 3: Try tsx if available
        try {
          require('tsx/cjs');
          delete require.cache[require.resolve(configPath)];
          const configModule = require(configPath);
          return configModule;
        } catch (tsxError: unknown) {
          const tsxMessage = tsxError instanceof Error ? tsxError.message : String(tsxError);

          throw new Error(
            `Failed to load TypeScript config with all methods:\n` +
              `- jiti: ${jitiMessage}\n` +
              `- ts-node: ${tsNodeMessage}\n` +
              `- tsx: ${tsxMessage}\n\n` +
              `Please ensure one of these packages is installed: jiti, ts-node, or tsx`
          );
        }
      }
    }
  }

  private validateConfig(config: unknown): asserts config is NotionTypedConfig {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be an object');
    }

    const configObj = config as Record<string, unknown>;

    if (!Array.isArray(configObj.databases)) {
      throw new Error('Config must have a databases array');
    }

    if (!configObj.output || typeof configObj.output !== 'object') {
      throw new Error('Config must have an output object');
    }

    const outputObj = configObj.output as Record<string, unknown>;
    if (!outputObj.path || typeof outputObj.path !== 'string') {
      throw new Error('Config output must have a path string');
    }

    for (const db of configObj.databases) {
      this.validateDatabase(db);
    }
  }

  private validateDatabase(db: unknown): void {
    if (!db || typeof db !== 'object') {
      throw new Error('Database config must be an object');
    }

    const dbObj = db as Record<string, unknown>;

    if (!dbObj.name || typeof dbObj.name !== 'string') {
      throw new Error('Database must have a name string');
    }

    if (!dbObj.displayName || typeof dbObj.displayName !== 'string') {
      throw new Error('Database must have a displayName string');
    }

    if (!dbObj.notionName || typeof dbObj.notionName !== 'string') {
      throw new Error('Database must have a notionName string');
    }

    if (!Array.isArray(dbObj.properties)) {
      throw new Error(`Database ${dbObj.name} must have a properties array`);
    }

    for (const prop of dbObj.properties) {
      this.validateProperty(prop, dbObj.name as string);
    }
  }

  private validateProperty(prop: unknown, dbName: string): void {
    if (!prop || typeof prop !== 'object') {
      throw new Error(`Property in database ${dbName} must be an object`);
    }

    const propObj = prop as Record<string, unknown>;

    if (!propObj.name || typeof propObj.name !== 'string') {
      throw new Error(`Property in database ${dbName} must have a name string`);
    }

    if (!propObj.displayName || typeof propObj.displayName !== 'string') {
      throw new Error(
        `Property ${propObj.name} in database ${dbName} must have a displayName string`
      );
    }

    if (!propObj.notionName || typeof propObj.notionName !== 'string') {
      throw new Error(
        `Property ${propObj.name} in database ${dbName} must have a notionName string`
      );
    }

    if (propObj.type !== null && propObj.type !== undefined && typeof propObj.type !== 'string') {
      throw new Error(
        `Property ${propObj.name} in database ${dbName} must have a type string or null`
      );
    }
  }

  getConfigPath(): string {
    return this.configPath;
  }
}
