import { ResolvedDatabaseConfig, ResolvedPropertyConfig } from '../types';

export class ClientGenerator {
  generateClient(databases: ResolvedDatabaseConfig[]): string {
    const imports = this.generateImports(databases);
    const class_ = this.generateClass(databases);

    return `${imports}\n\n${class_}`;
  }

  private generateImports(databases: ResolvedDatabaseConfig[]): string {
    const typeImports = databases
      .flatMap((db) => [db.name, `Create${db.name}`, `Update${db.name}`])
      .join(', ');

    return `import { Client } from '@notionhq/client';
import type { 
  ${typeImports},
  DatabaseNames,
  GetDatabaseType,
  GetDatabaseTypeByName,
  GetCreateType,
  GetUpdateType
} from './types';
import { validators } from './validators';

// Internal types for the client
interface ResolvedPropertyConfig {
  id: string;
  name: string;
  displayName: string;
  notionName: string;
  type: string;
  options?: any[];
}

interface ResolvedDatabaseConfig {
  id: string;
  name: string;
  displayName: string;
  notionName: string;
  properties: ResolvedPropertyConfig[];
}`;
  }

  private generateClass(databases: ResolvedDatabaseConfig[]): string {
    return `export class NotionTypedClient {
  private client: Client;
  private databaseIds: Record<DatabaseNames, string>;

  constructor(options: { auth: string }) {
    this.client = new Client(options);
    this.databaseIds = {
${databases.map((db) => `      '${db.name}': '${db.id}'`).join(',\n')}
    };
  }

  /**
   * Get database ID by name
   */
  getDatabaseId<T extends DatabaseNames>(name: T): string {
    return this.databaseIds[name];
  }

  /**
   * Create a new page in a database with type safety and validation
   */
  async createPage<T extends DatabaseNames>(
    databaseName: T,
    properties: GetCreateType<T>
  ): Promise<any> {
    const databaseId = this.getDatabaseId(databaseName);
    
    // Validate properties
    const validator = validators.create[databaseName];
    if (validator && !validator(properties)) {
      throw new Error(\`Validation failed: \${JSON.stringify(validator.errors)}\`);
    }
    
    // Convert properties to Notion API format
    const notionProperties = this.convertPropertiesToNotion(databaseName, properties);
    
    return await this.client.pages.create({
      parent: { database_id: databaseId },
      properties: notionProperties
    });
  }

  /**
   * Update a page with type safety and validation
   */
  async updatePage<T extends DatabaseNames>(
    pageId: string,
    databaseName: T,
    properties: GetUpdateType<T>
  ): Promise<any> {
    // Validate properties
    const validator = validators.update[databaseName];
    if (validator && !validator(properties)) {
      throw new Error(\`Validation failed: \${JSON.stringify(validator.errors)}\`);
    }
    
    // Convert properties to Notion API format
    const notionProperties = this.convertPropertiesToNotion(databaseName, properties);
    
    return await this.client.pages.update({
      page_id: pageId,
      properties: notionProperties
    });
  }

  /**
   * Query a database with type safety
   */
  async queryDatabase<T extends DatabaseNames>(
    databaseName: T,
    args?: {
      filter?: any;
      sorts?: any[];
      start_cursor?: string;
      page_size?: number;
    }
  ): Promise<{
    results: Array<{
      id: string;
      properties: GetDatabaseTypeByName<T>;
      [key: string]: any;
    }>;
    has_more: boolean;
    next_cursor: string | null;
  }> {
    const databaseId = this.getDatabaseId(databaseName);
    
    const response = await this.client.databases.query({
      database_id: databaseId,
      ...args
    });
    
    // Convert response properties to typed format
    const results = response.results.map((page: any) => ({
      ...page,
      properties: this.convertPropertiesFromNotion(databaseName, page.properties)
    }));
    
    return {
      results,
      has_more: response.has_more,
      next_cursor: response.next_cursor
    };
  }

  /**
   * Get a page by ID
   */
  async getPage<T extends DatabaseNames>(
    pageId: string,
    databaseName: T
  ): Promise<{
    id: string;
    properties: GetDatabaseTypeByName<T>;
    [key: string]: any;
  }> {
    const page = await this.client.pages.retrieve({ page_id: pageId });
    
    if ('properties' in page) {
      return {
        ...page,
        properties: this.convertPropertiesFromNotion(databaseName, page.properties)
      };
    }
    
    throw new Error('Failed to retrieve page properties');
  }

  /**
   * Delete a page
   */
  async deletePage(pageId: string): Promise<any> {
    return await this.client.pages.update({
      page_id: pageId,
      archived: true
    });
  }

  /**
   * Convert properties to Notion API format
   */
  private convertPropertiesToNotion(databaseName: string, properties: any): any {
    const converted: any = {};
    const config = this.getDatabaseConfig(databaseName);
    
    for (const [key, value] of Object.entries(properties)) {
      const propConfig = config?.properties.find(p => p.name === key);
      if (!propConfig) continue;
      
      converted[propConfig.notionName] = this.convertPropertyToNotion(propConfig, value);
    }
    
    return converted;
  }

  /**
   * Convert properties from Notion API format
   */
  private convertPropertiesFromNotion(databaseName: string, properties: any): any {
    const converted: any = {};
    const config = this.getDatabaseConfig(databaseName);
    
    for (const [notionName, value] of Object.entries(properties)) {
      const propConfig = config?.properties.find(p => p.notionName === notionName);
      if (!propConfig) continue;
      
      converted[propConfig.name] = this.convertPropertyFromNotion(propConfig, value);
    }
    
    return converted;
  }

  /**
   * Convert a single property to Notion API format
   */
  private convertPropertyToNotion(config: ResolvedPropertyConfig, value: any): any {
    if (value === null || value === undefined) {
      return undefined;
    }
    
    switch (config.type) {
      case 'title':
        return {
          title: [{ text: { content: value } }]
        };
      
      case 'rich_text':
        return {
          rich_text: [{ text: { content: value } }]
        };
      
      case 'number':
        return { number: value };
      
      case 'select':
      case 'status':
        return { [config.type]: { name: value } };
      
      case 'multi_select':
        return {
          multi_select: Array.isArray(value) 
            ? value.map(v => ({ name: v }))
            : []
        };
      
      case 'date':
        return { date: value };
      
      case 'people':
        return {
          people: Array.isArray(value)
            ? value.map(id => ({ id }))
            : []
        };
      
      case 'files':
        return {
          files: Array.isArray(value)
            ? value.map(file => ({
                name: file.name,
                external: { url: file.url }
              }))
            : []
        };
      
      case 'checkbox':
        return { checkbox: value };
      
      case 'url':
        return { url: value };
      
      case 'email':
        return { email: value };
      
      case 'phone_number':
        return { phone_number: value };
      
      case 'relation':
        return {
          relation: Array.isArray(value)
            ? value.map(id => ({ id }))
            : []
        };
      
      default:
        return value;
    }
  }

  /**
   * Convert a single property from Notion API format
   */
  private convertPropertyFromNotion(config: ResolvedPropertyConfig, value: any): any {
    if (!value) return null;
    
    switch (config.type) {
      case 'title':
        return value.title?.[0]?.text?.content || '';
      
      case 'rich_text':
        return value.rich_text?.[0]?.text?.content || '';
      
      case 'number':
        return value.number;
      
      case 'select':
      case 'status':
        return value[config.type];
      
      case 'multi_select':
        return value.multi_select || [];
      
      case 'date':
        return value.date;
      
      case 'people':
        return value.people || [];
      
      case 'files':
        return value.files || [];
      
      case 'checkbox':
        return value.checkbox || false;
      
      case 'url':
        return value.url;
      
      case 'email':
        return value.email;
      
      case 'phone_number':
        return value.phone_number;
      
      case 'relation':
        return value.relation || [];
      
      case 'created_time':
        return value.created_time;
      
      case 'created_by':
        return value.created_by;
      
      case 'last_edited_time':
        return value.last_edited_time;
      
      case 'last_edited_by':
        return value.last_edited_by;
      
      case 'formula':
        return value.formula;
      
      case 'rollup':
        return value.rollup;
      
      case 'unique_id':
        return value.unique_id;
      
      default:
        return value;
    }
  }

  /**
   * Get database configuration
   */
  private getDatabaseConfig(databaseName: string): ResolvedDatabaseConfig | undefined {
    // This will be injected during generation
    const configs: Record<string, ResolvedDatabaseConfig> = {
${databases.map((db) => `      '${db.name}': ${JSON.stringify(db, null, 8).split('\n').join('\n      ')}`).join(',\n')}
    };
    
    return configs[databaseName];
  }

  /**
   * Get the underlying Notion client for advanced usage
   */
  getClient(): Client {
    return this.client;
  }
}

// Type helper for DatabaseIdMapping
type DatabaseIdMapping = {
${databases.map((db) => `  '${db.id}': ${db.name};`).join('\n')}
};`;
  }
}
