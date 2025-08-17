import { Client } from '@notionhq/client';
import type { NotionClientInterface } from '../interfaces';
import type {
  DatabaseConfig,
  DatabaseSchema,
  FetchResult,
  NotionPropertyType,
  PropertyConfig,
  ResolvedDatabaseConfig,
  ResolvedPropertyConfig,
} from '../types';
import { Logger } from '../utils';

export class NotionFetcher {
  private client: NotionClientInterface;
  private logger: Logger;

  constructor(client?: NotionClientInterface) {
    this.logger = Logger.create('NotionFetcher');

    if (client) {
      // Use injected client (must have same interface as official Notion client)
      this.client = client;
    } else {
      // Default: use official Notion client
      const key = process.env.NOTION_API_KEY;
      if (!key) {
        throw new Error(
          'Notion API key is required. Set NOTION_API_KEY environment variable or inject a Notion client.'
        );
      }
      this.client = new Client({ auth: key });
    }
  }

  async fetchSchemas(databases: DatabaseConfig[]): Promise<FetchResult> {
    const result: FetchResult = {
      databases: [],
      schemas: {},
      configUpdates: [],
    };

    for (const dbConfig of databases) {
      try {
        this.logger.info(`Fetching schema for database: ${dbConfig.displayName}`);

        // データベースを検索または取得
        const database = await this.findOrGetDatabase(dbConfig);
        if (!database) {
          this.logger.error(`Database not found: ${dbConfig.notionName}`);
          continue;
        }

        // スキーマを取得
        const schema = await this.getDatabaseSchema(database.id);
        result.schemas[dbConfig.name] = schema;

        // プロパティを解決
        const resolvedProperties = await this.resolveProperties(
          dbConfig.properties,
          schema.properties
        );

        // 解決されたデータベース設定を作成
        const resolvedDb: ResolvedDatabaseConfig = {
          id: database.id,
          name: dbConfig.name,
          displayName: dbConfig.displayName,
          notionName: this.extractDatabaseTitle(schema),
          properties: resolvedProperties,
        };
        result.databases.push(resolvedDb);

        // 設定更新情報を収集
        const updates = this.collectConfigUpdates(dbConfig, resolvedDb);
        if (updates) {
          result.configUpdates.push(updates);
        }

        this.logger.success(`Successfully fetched schema for: ${dbConfig.displayName}`);
      } catch (error) {
        this.logger.error(`Failed to fetch schema for ${dbConfig.displayName}: ${error}`);
      }
    }

    return result;
  }

  private async findOrGetDatabase(config: DatabaseConfig): Promise<{ id: string } | null> {
    // IDが指定されている場合は直接取得
    if (config.id) {
      try {
        const db = await this.client.databases.retrieve({ database_id: config.id });
        return { id: db.id };
      } catch (_error) {
        this.logger.warning(`Database with ID ${config.id} not found, trying search by name`);
      }
    }

    // 名前で検索
    const searchResult = await this.client.search({
      query: config.notionName,
      filter: { property: 'object', value: 'database' },
    });

    for (const result of searchResult.results) {
      if (result.object === 'database' && 'title' in result) {
        const title = this.extractTitle(result.title);
        if (title === config.notionName) {
          return { id: result.id };
        }
      }
    }

    return null;
  }

  private async getDatabaseSchema(databaseId: string): Promise<DatabaseSchema> {
    const database = await this.client.databases.retrieve({ database_id: databaseId });

    return {
      id: database.id,
      title: 'title' in database ? (database.title as any) : [],
      properties: 'properties' in database ? (database.properties as any) : {},
    };
  }

  private async resolveProperties(
    configs: PropertyConfig[],
    schemaProperties: Record<string, any>
  ): Promise<ResolvedPropertyConfig[]> {
    const resolved: ResolvedPropertyConfig[] = [];

    for (const config of configs) {
      let propertySchema = null;
      let propertyId = config.id;
      let actualNotionName = config.notionName;
      let actualType = config.type;

      // IDで検索
      if (config.id) {
        propertySchema = Object.values(schemaProperties).find(
          (p: any) => p.id === config.id
        ) as any;
      }

      // notionNameで検索
      if (!propertySchema) {
        const entry = Object.entries(schemaProperties).find(([name]) => name === config.notionName);
        if (entry) {
          actualNotionName = entry[0];
          propertySchema = entry[1];
        }
      }

      if (propertySchema) {
        propertyId = propertySchema.id;

        // typeがnullの場合、Notionから取得
        if (actualType === null) {
          actualType = propertySchema.type as NotionPropertyType;
          this.logger.info(`Auto-detected type for ${config.name}: ${actualType}`);
        }

        // 型の不一致を警告
        if (actualType && actualType !== propertySchema.type) {
          this.logger.warning(
            `Type mismatch for ${config.name}: config says ${actualType}, Notion says ${propertySchema.type}`
          );
        }

        const resolvedProp: ResolvedPropertyConfig = {
          id: propertyId || '',
          name: config.name,
          displayName: config.displayName,
          notionName: actualNotionName,
          type: propertySchema.type,
          options: this.extractOptions(propertySchema),
        };
        resolved.push(resolvedProp);
      } else {
        this.logger.warning(`Property not found in Notion: ${config.notionName}`);

        // プロパティが見つからない場合でも、設定は保持
        if (actualType) {
          resolved.push({
            id: propertyId || '',
            name: config.name,
            displayName: config.displayName,
            notionName: actualNotionName,
            type: actualType,
          });
        }
      }
    }

    return resolved;
  }

  private extractOptions(propertySchema: any): any[] | undefined {
    if (propertySchema.select?.options) {
      return propertySchema.select.options;
    }
    if (propertySchema.multi_select?.options) {
      return propertySchema.multi_select.options;
    }
    if (propertySchema.status?.options) {
      return propertySchema.status.options;
    }
    return undefined;
  }

  private extractTitle(title: any[]): string {
    if (!Array.isArray(title) || title.length === 0) return '';

    return title
      .map((t: any) => {
        if (t.type === 'text' && t.text?.content) {
          return t.text.content;
        }
        return '';
      })
      .join('');
  }

  private extractDatabaseTitle(schema: DatabaseSchema): string {
    return this.extractTitle(schema.title);
  }

  private collectConfigUpdates(original: DatabaseConfig, resolved: ResolvedDatabaseConfig): any {
    const updates: any = {
      database: original,
      updates: {},
    };

    // データベースIDの更新
    if (!original.id && resolved.id) {
      updates.updates.id = resolved.id;
    }

    // データベース名の変更
    if (original.notionName !== resolved.notionName) {
      updates.updates.notionName = resolved.notionName;
    }

    // プロパティの更新
    const propertyUpdates: any[] = [];
    for (const resolvedProp of resolved.properties) {
      const originalProp = original.properties.find((p) => p.name === resolvedProp.name);
      if (originalProp) {
        const propUpdate: any = { name: originalProp.name };

        // IDの更新
        if (!originalProp.id && resolvedProp.id) {
          propUpdate.id = resolvedProp.id;
        }

        // notionNameの更新
        if (originalProp.notionName !== resolvedProp.notionName) {
          propUpdate.notionName = resolvedProp.notionName;
        }

        // typeの自動検出
        if (originalProp.type === null && resolvedProp.type) {
          propUpdate.type = resolvedProp.type;
        }

        if (propUpdate.id || propUpdate.notionName || propUpdate.type) {
          propertyUpdates.push(propUpdate);
        }
      }
    }

    if (propertyUpdates.length > 0) {
      updates.updates.properties = propertyUpdates;
    }

    // 更新がない場合はnullを返す
    if (Object.keys(updates.updates).length === 0) {
      return null;
    }

    return updates;
  }
}
