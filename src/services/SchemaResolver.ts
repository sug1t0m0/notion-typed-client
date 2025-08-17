import * as readline from 'node:readline';
import type { FetchResult } from '../types';
import type { NotionClientInterface } from '../interfaces';
import { ConfigLoader, ConfigUpdater, Logger } from '../utils';
import { NotionFetcher } from './NotionFetcher';

export class SchemaResolver {
  private logger: Logger;
  private configLoader: ConfigLoader;
  private fetcher: NotionFetcher;

  constructor(options?: {
    configPath?: string;
    client?: NotionClientInterface;
  }) {
    this.logger = Logger.create('SchemaResolver');
    this.configLoader = new ConfigLoader(options?.configPath);
    this.fetcher = new NotionFetcher(options?.client);
  }

  async resolve(options: { dryRun?: boolean } = {}): Promise<FetchResult> {
    // 設定を読み込む
    this.logger.info('Loading configuration...');
    const config = await this.configLoader.load();

    // スキーマを取得
    this.logger.info('Fetching schemas from Notion...');
    const result = await this.fetcher.fetchSchemas(config.databases);

    // 設定の更新が必要な場合
    if (result.configUpdates.length > 0 && !options.dryRun) {
      await this.applyConfigUpdates(result.configUpdates);
    } else if (options.dryRun && result.configUpdates.length > 0) {
      this.showConfigUpdates(result.configUpdates);
    }

    return result;
  }

  private async applyConfigUpdates(updates: any[]): Promise<void> {
    this.logger.info('Configuration updates detected:');
    this.showConfigUpdates(updates);

    const shouldUpdate = await this.promptUser('Do you want to apply these updates? (y/n): ');
    if (!shouldUpdate) {
      this.logger.info('Updates cancelled by user');
      return;
    }

    const configPath = this.configLoader.getConfigPath();
    const updater = new ConfigUpdater(configPath);

    for (const update of updates) {
      this.logger.info(`Updating database: ${update.database.name}`);

      // プロパティの更新を含む
      const fullUpdates = { ...update.updates };

      // typeの更新も含める
      if (fullUpdates.properties) {
        fullUpdates.properties = fullUpdates.properties.map((prop: any) => {
          const originalProp = update.database.properties.find((p: any) => p.name === prop.name);
          if (originalProp && originalProp.type === null && prop.type) {
            return { ...prop, type: prop.type };
          }
          return prop;
        });
      }

      await updater.updateDatabase(update.database.name, fullUpdates);
    }

    this.logger.success('Configuration updated successfully');
  }

  private showConfigUpdates(updates: any[]): void {
    for (const update of updates) {
      console.log(`\nDatabase: ${update.database.displayName}`);

      if (update.updates.id) {
        console.log(`  - ID: null → ${update.updates.id}`);
      }

      if (update.updates.notionName) {
        console.log(
          `  - Notion Name: ${update.database.notionName} → ${update.updates.notionName}`
        );
      }

      if (update.updates.properties) {
        for (const prop of update.updates.properties) {
          console.log(`  Property: ${prop.name}`);
          if (prop.id) {
            console.log(`    - ID: null → ${prop.id}`);
          }
          if (prop.notionName) {
            const original = update.database.properties.find((p: any) => p.name === prop.name);
            console.log(`    - Notion Name: ${original?.notionName} → ${prop.notionName}`);
          }
          if (prop.type) {
            console.log(`    - Type: null → ${prop.type}`);
          }
        }
      }
    }
  }

  private async promptUser(question: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  async validateConfig(): Promise<boolean> {
    try {
      const config = await this.configLoader.load();
      const result = await this.fetcher.fetchSchemas(config.databases);

      let hasIssues = false;

      for (const db of result.databases) {
        const configDb = config.databases.find((d) => d.name === db.name);
        if (!configDb) continue;

        // IDの不一致をチェック
        if (configDb.id && configDb.id !== db.id) {
          this.logger.warning(`Database ID mismatch for ${db.name}`);
          hasIssues = true;
        }

        // プロパティの存在チェック
        for (const prop of configDb.properties) {
          const resolvedProp = db.properties.find((p) => p.name === prop.name);
          if (!resolvedProp) {
            this.logger.warning(`Property ${prop.name} not found in database ${db.name}`);
            hasIssues = true;
          }
        }
      }

      if (!hasIssues) {
        this.logger.success('Configuration is valid and in sync with Notion');
        return true;
      } else {
        this.logger.warning('Configuration has issues. Run "fetch" command to fix them.');
        return false;
      }
    } catch (error) {
      this.logger.error(`Validation failed: ${error}`);
      return false;
    }
  }
}
