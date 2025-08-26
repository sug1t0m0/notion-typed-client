import type { ResolvedDatabaseConfig } from '../types';

export class ClientGenerator {
  generateClient(databases: ResolvedDatabaseConfig[]): string {
    const imports = this.generateImports(databases);
    const class_ = this.generateClass(databases);

    return `${imports}\n\n${class_}`;
  }

  private generateImports(databases: ResolvedDatabaseConfig[]): string {
    const typeImports = databases
      .flatMap((db) => [db.name, `Create${db.name}`, `Update${db.name}`, `${db.name}Filter`])
      .join(', ');

    return `import { Client } from '@notionhq/client';
import type { 
  ${typeImports},
  DatabaseNames,
  GetDatabaseType,
  GetDatabaseTypeByName,
  GetCreateType,
  GetUpdateType,
  GetFilterType,
  GetStatusProperties,
  GetStatusGroups,
  GetStatusOptions,
  GetStatusGroupMapping,
  GetOptionToGroupMapping
} from './types';
import { validators } from './validators';

// Interface for Notion client to enable dependency injection
interface NotionClientInterface {
  databases: {
    retrieve(args: { database_id: string }): Promise<any>;
    query(args: {
      database_id: string;
      filter?: any;
      sorts?: any[];
      start_cursor?: string;
      page_size?: number;
    }): Promise<{
      results: any[];
      has_more: boolean;
      next_cursor: string | null;
    }>;
  };
  pages: {
    create(args: {
      parent: { database_id: string };
      properties: any;
    }): Promise<any>;
    retrieve(args: { page_id: string }): Promise<any>;
    update(args: {
      page_id: string;
      properties?: any;
      archived?: boolean;
    }): Promise<any>;
  };
}

// Internal types for the client
interface StatusGroup {
  id: string;
  name: string;
  color: string;
  option_ids: string[];
}

interface ResolvedPropertyConfig {
  id: string;
  name: string;
  displayName: string;
  notionName: string;
  type: string;
  options?: any[];
  groups?: StatusGroup[];
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
  private client: NotionClientInterface;
  private databaseIds: Record<DatabaseNames, string>;

  constructor(options: { client: NotionClientInterface }) {
    // Use injected client (must have same interface as official Notion client)
    this.client = options.client;
    
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
      filter?: GetFilterType<T>;
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
    
    // Convert filter property names from code names to Notion names
    let processedArgs = args;
    if (args?.filter) {
      processedArgs = {
        ...args,
        filter: this.convertFilterToNotion(databaseName, args.filter)
      };
    }
    
    const response = await this.client.databases.query({
      database_id: databaseId,
      ...processedArgs
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
   * Query all pages from a database (fetches all pages automatically)
   * ⚠️ Use with caution for large datasets as this loads all data into memory
   */
  async queryDatabaseAll<T extends DatabaseNames>(
    databaseName: T,
    args?: {
      filter?: GetFilterType<T>;
      sorts?: any[];
      page_size?: number;
    }
  ): Promise<Array<{
    id: string;
    properties: GetDatabaseTypeByName<T>;
    [key: string]: any;
  }>> {
    const allResults: Array<{
      id: string;
      properties: GetDatabaseTypeByName<T>;
      [key: string]: any;
    }> = [];
    
    let cursor: string | undefined = undefined;
    let hasMore = true;
    
    while (hasMore) {
      const response = await this.queryDatabase(databaseName, {
        ...args,
        start_cursor: cursor,
        page_size: args?.page_size || 100
      });
      
      allResults.push(...response.results);
      
      hasMore = response.has_more;
      cursor = response.next_cursor || undefined;
    }
    
    return allResults;
  }

  /**
   * Query a database with an async iterator for memory-efficient processing
   * Ideal for batch processing and large datasets
   */
  async *queryDatabaseIterator<T extends DatabaseNames>(
    databaseName: T,
    args?: {
      filter?: GetFilterType<T>;
      sorts?: any[];
      page_size?: number;
    }
  ): AsyncGenerator<{
    id: string;
    properties: GetDatabaseTypeByName<T>;
    [key: string]: any;
  }, void, unknown> {
    let cursor: string | undefined = undefined;
    let hasMore = true;
    
    while (hasMore) {
      const response = await this.queryDatabase(databaseName, {
        ...args,
        start_cursor: cursor,
        page_size: args?.page_size || 100
      });
      
      for (const item of response.results) {
        yield item;
      }
      
      hasMore = response.has_more;
      cursor = response.next_cursor || undefined;
    }
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
   * Convert filter to Notion API format
   */
  private convertFilterToNotion(databaseName: string, filter: any): any {
    if (!filter) return filter;
    
    // Handle compound filters (and/or)
    if ('and' in filter && Array.isArray(filter.and)) {
      return {
        and: filter.and.map((f: any) => this.convertFilterToNotion(databaseName, f))
      };
    }
    
    if ('or' in filter && Array.isArray(filter.or)) {
      return {
        or: filter.or.map((f: any) => this.convertFilterToNotion(databaseName, f))
      };
    }
    
    // Handle property filters
    if ('property' in filter) {
      const config = this.getDatabaseConfig(databaseName);
      const propConfig = config?.properties.find(p => p.name === filter.property);
      
      if (propConfig) {
        const convertedFilter = { ...filter };
        convertedFilter.property = propConfig.notionName;
        return convertedFilter;
      }
    }
    
    // Handle timestamp filters (no property conversion needed)
    if ('timestamp' in filter) {
      return filter;
    }
    
    return filter;
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
        return { [config.type]: { name: value } };
      
      case 'status':
        // For status, handle both string (name only) and object (name + group) formats
        if (typeof value === 'string') {
          return { status: { name: value } };
        } else if (value && typeof value === 'object' && value.name) {
          // Extract just the name for the API call
          return { status: { name: value.name } };
        }
        return { status: { name: value } };
      
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
        return value[config.type];
      
      case 'status':
        const statusValue = value[config.type];
        if (statusValue && statusValue.name && config.groups && config.groups.length > 0) {
          // Find the group for this status option
          const group = config.groups.find(g => g.option_ids.includes(statusValue.id));
          return {
            ...statusValue,
            group: group?.name || undefined
          };
        }
        return statusValue;
      
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
   * Get status groups for a property (Type-safe)
   */
  getStatusGroups<T extends DatabaseNames, P extends GetStatusProperties<T>>(
    databaseName: T,
    propertyName: P
  ): GetStatusGroups<T, P>[] | undefined {
    const config = this.getDatabaseConfig(databaseName);
    const propConfig = config?.properties.find(p => p.name === propertyName);
    
    if (propConfig?.type === 'status' && propConfig.groups) {
      return propConfig.groups.map(g => g.name) as GetStatusGroups<T, P>[];
    }
    
    return undefined;
  }

  /**
   * Get status options for a specific group (Type-safe)
   */
  getStatusOptionsForGroup<T extends DatabaseNames, P extends GetStatusProperties<T>>(
    databaseName: T,
    propertyName: P,
    groupName: GetStatusGroups<T, P>
  ): GetStatusGroupMapping<T, P>[GetStatusGroups<T, P>][] {
    const config = this.getDatabaseConfig(databaseName);
    const propConfig = config?.properties.find(p => p.name === propertyName);
    
    if (propConfig?.type === 'status' && propConfig.groups && propConfig.options) {
      const group = propConfig.groups.find(g => g.name === groupName);
      if (group) {
        return group.option_ids
          .map(optionId => {
            const option = propConfig.options?.find((opt: any) => opt.id === optionId);
            return option?.name;
          })
          .filter(Boolean) as GetStatusGroupMapping<T, P>[GetStatusGroups<T, P>][];
      }
    }
    
    return [] as GetStatusGroupMapping<T, P>[GetStatusGroups<T, P>][];
  }

  /**
   * Get the group name for a status option (Type-safe)
   */
  getGroupForStatusOption<T extends DatabaseNames, P extends GetStatusProperties<T>>(
    databaseName: T,
    propertyName: P,
    optionName: GetStatusOptions<T, P>
  ): GetOptionToGroupMapping<T, P>[GetStatusOptions<T, P>] | undefined {
    const config = this.getDatabaseConfig(databaseName);
    const propConfig = config?.properties.find(p => p.name === propertyName);
    
    if (propConfig?.type === 'status' && propConfig.groups && propConfig.options) {
      const option = propConfig.options.find((opt: any) => opt.name === optionName);
      if (option) {
        const group = propConfig.groups.find(g => g.option_ids.includes(option.id));
        return group?.name as GetOptionToGroupMapping<T, P>[GetStatusOptions<T, P>];
      }
    }
    
    return undefined;
  }

  /**
   * Validate if an option belongs to a specific group (Type-safe)
   */
  isOptionInGroup<T extends DatabaseNames, P extends GetStatusProperties<T>>(
    databaseName: T,
    propertyName: P,
    optionName: GetStatusOptions<T, P>,
    groupName: GetStatusGroups<T, P>
  ): boolean {
    const actualGroup = this.getGroupForStatusOption(databaseName, propertyName, optionName);
    return (actualGroup as string) === (groupName as string);
  }

  /**
   * Get all valid options for a specific group (Type-safe helper)
   */
  getValidOptionsForGroup<T extends DatabaseNames, P extends GetStatusProperties<T>, G extends GetStatusGroups<T, P>>(
    databaseName: T,
    propertyName: P,
    groupName: G
  ): GetStatusGroupMapping<T, P>[G][] {
    return this.getStatusOptionsForGroup(databaseName, propertyName, groupName) as GetStatusGroupMapping<T, P>[G][];
  }

  /**
   * Get the underlying Notion client for advanced usage
   */
  getClient(): NotionClientInterface {
    return this.client;
  }
}

// Type helper for DatabaseIdMapping
type DatabaseIdMapping = {
${databases.map((db) => `  '${db.id}': ${db.name};`).join('\n')}
};`;
  }
}
