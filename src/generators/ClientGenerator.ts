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

    // Check if any database has status properties
    const hasStatusProperties = databases.some((db) =>
      db.properties.some((prop) => prop.type === 'status')
    );

    const statusImports = hasStatusProperties
      ? `,
  GetStatusProperties,
  GetStatusGroups,
  GetStatusOptions,
  GetStatusGroupMapping,
  GetOptionToGroupMapping`
      : '';

    return `import { Client } from '@notionhq/client';
import type {
  QueryDatabaseParameters,
  QueryDatabaseResponse,
  CreatePageParameters,
  UpdatePageParameters,
  GetPageParameters,
  GetDatabaseParameters,
  PageObjectResponse,
  PartialPageObjectResponse,
  DatabaseObjectResponse,
  PartialDatabaseObjectResponse,
  CreatePageResponse,
  UpdatePageResponse,
  GetPageResponse,
  GetDatabaseResponse
} from '@notionhq/client/build/src/api-endpoints';
import type { 
  ${typeImports},
  DatabaseNames,
  GetDatabaseType,
  GetDatabaseTypeByName,
  GetCreateType,
  GetUpdateType,
  GetFilterType${statusImports}
} from './types';
import { validators } from './validators';

// Internal types for the client
interface StatusGroup {
  id: string;
  name: string;
  color: string;
  option_ids: string[];
}

interface PropertyOption {
  id: string;
  name: string;
  color?: string;
  description?: string | null;
}

interface ResolvedPropertyConfig {
  id: string;
  name: string;
  displayName: string;
  notionName: string;
  type: string;
  options?: PropertyOption[];
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

  private generateStatusMethods(): string {
    return `
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
            const option = propConfig.options?.find(opt => opt.id === optionId);
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
      const option = propConfig.options.find(opt => opt.name === optionName);
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
  }`;
  }

  private generateClass(databases: ResolvedDatabaseConfig[]): string {
    // Check if any database has status properties
    const hasStatusProperties = databases.some((db) =>
      db.properties.some((prop) => prop.type === 'status')
    );

    const statusMethods = hasStatusProperties ? this.generateStatusMethods() : '';
    return `export class NotionTypedClient {
  private client: Client;
  private databaseIds: Record<DatabaseNames, string>;

  constructor(options: { client: Client }) {
    // Use injected client
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
  ): Promise<PageObjectResponse | PartialPageObjectResponse> {
    const databaseId = this.getDatabaseId(databaseName);
    
    // Validate properties
    const validator = validators.create[databaseName];
    if (validator && !validator(properties)) {
      throw new Error(\`Validation failed: \${JSON.stringify(validator.errors)}\`);
    }
    
    // Convert properties to Notion API format
    const notionProperties = this.convertPropertiesToNotion(databaseName, properties as unknown as Record<string, unknown>);
    
    return await this.client.pages.create({
      parent: { database_id: databaseId },
      properties: notionProperties as any
    });
  }

  /**
   * Update a page with type safety and validation
   */
  async updatePage<T extends DatabaseNames>(
    pageId: string,
    databaseName: T,
    properties: GetUpdateType<T>
  ): Promise<PageObjectResponse | PartialPageObjectResponse> {
    // Validate properties
    const validator = validators.update[databaseName];
    if (validator && !validator(properties)) {
      throw new Error(\`Validation failed: \${JSON.stringify(validator.errors)}\`);
    }
    
    // Convert properties to Notion API format
    const notionProperties = this.convertPropertiesToNotion(databaseName, properties as unknown as Record<string, unknown>);
    
    return await this.client.pages.update({
      page_id: pageId,
      properties: notionProperties as any
    });
  }

  /**
   * Query a database with type safety
   */
  async queryDatabase<T extends DatabaseNames>(
    databaseName: T,
    args?: {
      filter?: GetFilterType<T>;
      sorts?: Array<{
        property?: string;
        timestamp?: 'created_time' | 'last_edited_time';
        direction: 'ascending' | 'descending';
      }>;
      start_cursor?: string;
      page_size?: number;
    }
  ): Promise<{
    results: Array<{
      id: string;
      properties: GetDatabaseTypeByName<T>;
      created_time?: string;
      last_edited_time?: string;
      archived?: boolean;
      url?: string;
      public_url?: string | null;
      parent?: unknown;
      icon?: unknown;
      cover?: unknown;
    }>;
    has_more: boolean;
    next_cursor: string | null;
  }> {
    const databaseId = this.getDatabaseId(databaseName);
    
    // Convert filter and sort property names from code names to Notion names
    let processedArgs: any = args;
    if (args?.filter || args?.sorts) {
      processedArgs = {
        ...args,
        ...(args.filter && { filter: this.convertFilterToNotion(databaseName, args.filter) }),
        ...(args.sorts && { sorts: this.convertSortsToNotion(databaseName, args.sorts) })
      };
    }
    
    const response = await this.client.databases.query({
      database_id: databaseId,
      ...processedArgs
    } as any);
    
    // Convert response properties to typed format
    const results = response.results
      .filter((page): page is PageObjectResponse => 'properties' in page)
      .map((page) => ({
        ...page,
        properties: this.convertPropertiesFromNotion(databaseName, page.properties) as unknown as GetDatabaseTypeByName<T>
      }));
    
    return {
      results: results as Array<{
        id: string;
        properties: GetDatabaseTypeByName<T>;
        created_time?: string;
        last_edited_time?: string;
        archived?: boolean;
        url?: string;
        public_url?: string | null;
        parent?: unknown;
        icon?: unknown;
        cover?: unknown;
      }>,
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
      sorts?: Array<{
        property?: string;
        timestamp?: 'created_time' | 'last_edited_time';
        direction: 'ascending' | 'descending';
      }>;
      page_size?: number;
    }
  ): Promise<Array<{
    id: string;
    properties: GetDatabaseTypeByName<T>;
    created_time?: string;
    last_edited_time?: string;
    archived?: boolean;
    url?: string;
    public_url?: string | null;
    parent?: unknown;
    icon?: unknown;
    cover?: unknown;
  }>> {
    const allResults: Array<{
      id: string;
      properties: GetDatabaseTypeByName<T>;
      created_time?: string;
      last_edited_time?: string;
      archived?: boolean;
      url?: string;
      public_url?: string | null;
      parent?: unknown;
      icon?: unknown;
      cover?: unknown;
    }> = [];
    
    let cursor: string | undefined = undefined;
    let hasMore = true;
    
    while (hasMore) {
      const response: {
        results: Array<{
          id: string;
          properties: GetDatabaseTypeByName<T>;
          created_time?: string;
          last_edited_time?: string;
          archived?: boolean;
          url?: string;
          public_url?: string | null;
          parent?: unknown;
          icon?: unknown;
          cover?: unknown;
        }>;
        has_more: boolean;
        next_cursor: string | null;
      } = await this.queryDatabase(databaseName, {
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
      sorts?: Array<{
        property?: string;
        timestamp?: 'created_time' | 'last_edited_time';
        direction: 'ascending' | 'descending';
      }>;
      page_size?: number;
    }
  ): AsyncGenerator<{
    id: string;
    properties: GetDatabaseTypeByName<T>;
    created_time?: string;
    last_edited_time?: string;
    archived?: boolean;
    url?: string;
    public_url?: string | null;
    parent?: unknown;
    icon?: unknown;
    cover?: unknown;
  }, void, unknown> {
    let cursor: string | undefined = undefined;
    let hasMore = true;
    
    while (hasMore) {
      const response: {
        results: Array<{
          id: string;
          properties: GetDatabaseTypeByName<T>;
          created_time?: string;
          last_edited_time?: string;
          archived?: boolean;
          url?: string;
          public_url?: string | null;
          parent?: unknown;
          icon?: unknown;
          cover?: unknown;
        }>;
        has_more: boolean;
        next_cursor: string | null;
      } = await this.queryDatabase(databaseName, {
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
    created_time?: string;
    last_edited_time?: string;
    archived?: boolean;
    url?: string;
    public_url?: string | null;
    parent?: unknown;
    icon?: unknown;
    cover?: unknown;
  }> {
    const page = await this.client.pages.retrieve({ page_id: pageId });
    
    if ('properties' in page) {
      return {
        ...page,
        properties: this.convertPropertiesFromNotion(databaseName, page.properties) as unknown as GetDatabaseTypeByName<T>
      } as any;
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
   * Convert sorts to Notion API format
   */
  private convertSortsToNotion(databaseName: string, sorts: Array<{
    property?: string;
    timestamp?: 'created_time' | 'last_edited_time';
    direction: 'ascending' | 'descending';
  }>): Array<{
    property?: string;
    timestamp?: 'created_time' | 'last_edited_time';
    direction: 'ascending' | 'descending';
  }> {
    if (!sorts || !Array.isArray(sorts)) return sorts;
    
    const config = this.getDatabaseConfig(databaseName);
    
    return sorts.map(sort => {
      if (sort.property) {
        const propConfig = config?.properties.find(p => p.name === sort.property);
        if (propConfig) {
          return {
            ...sort,
            property: propConfig.notionName
          };
        }
      }
      // If no match found or timestamp sort, return as-is
      return sort;
    });
  }

  /**
   * Convert filter to Notion API format
   */
  private convertFilterToNotion(databaseName: string, filter: unknown): unknown {
    if (!filter || typeof filter !== 'object') return filter;
    
    const filterObj = filter as Record<string, unknown>;
    
    // Handle compound filters (and/or)
    if ('and' in filterObj && Array.isArray(filterObj.and)) {
      return {
        and: filterObj.and.map((f: unknown) => this.convertFilterToNotion(databaseName, f))
      };
    }
    
    if ('or' in filterObj && Array.isArray(filterObj.or)) {
      return {
        or: filterObj.or.map((f: unknown) => this.convertFilterToNotion(databaseName, f))
      };
    }
    
    // Handle property filters
    if ('property' in filterObj) {
      const config = this.getDatabaseConfig(databaseName);
      const propConfig = config?.properties.find(p => p.name === filterObj.property);
      
      if (propConfig) {
        const convertedFilter = { ...filterObj };
        convertedFilter.property = propConfig.notionName;
        return convertedFilter;
      }
    }
    
    // Handle timestamp filters (no property conversion needed)
    if ('timestamp' in filterObj) {
      return filterObj;
    }
    
    return filterObj;
  }

  /**
   * Convert properties to Notion API format
   */
  private convertPropertiesToNotion(databaseName: string, properties: Record<string, unknown>): Record<string, unknown> {
    const converted: Record<string, unknown> = {};
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
  private convertPropertiesFromNotion(databaseName: string, properties: Record<string, unknown>): Record<string, unknown> {
    const converted: Record<string, unknown> = {};
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
  private convertPropertyToNotion(config: ResolvedPropertyConfig, value: unknown): unknown {
    if (value === null || value === undefined) {
      return undefined;
    }
    
    switch (config.type) {
      case 'title':
        return {
          title: [{ text: { content: String(value) } }]
        };
      
      case 'rich_text':
        return {
          rich_text: [{ text: { content: value } }]
        };
      
      case 'number':
        return { number: value };
      
      case 'select':
        return { [config.type]: { name: value } };
      
      case 'status': {
        // For status, handle both string (name only) and object (name + group) formats
        const val = value as any;
        if (typeof val === 'string') {
          return { status: { name: val } };
        } else if (val && typeof val === 'object' && val.name) {
          // Extract just the name for the API call
          return { status: { name: val.name } };
        }
        return { status: { name: val } };
      }
      
      case 'multi_select':
        return {
          multi_select: Array.isArray(value) 
            ? value.map(v => ({ name: String(v) }))
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
            ? value.map((file: any) => ({
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
  private convertPropertyFromNotion(config: ResolvedPropertyConfig, value: unknown): unknown {
    if (!value) return null;
    
    const val = value as any;
    
    switch (config.type) {
      case 'title':
        return val.title?.[0]?.text?.content || '';
      
      case 'rich_text':
        return val.rich_text?.[0]?.text?.content || '';
      
      case 'number':
        return val.number;
      
      case 'select':
        return val[config.type]?.name || null;
      
      case 'status':
        const statusValue = val[config.type];
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
        return val.multi_select || [];
      
      case 'date':
        return val.date;
      
      case 'people':
        return val.people || [];
      
      case 'files':
        return val.files || [];
      
      case 'checkbox':
        return val.checkbox || false;
      
      case 'url':
        return val.url;
      
      case 'email':
        return val.email;
      
      case 'phone_number':
        return val.phone_number;
      
      case 'relation':
        return val.relation?.map((r: any) => r.id) || [];
      
      case 'created_time':
        return val.created_time;
      
      case 'created_by':
        return val.created_by;
      
      case 'last_edited_time':
        return val.last_edited_time;
      
      case 'last_edited_by':
        return val.last_edited_by;
      
      case 'formula':
        return val.formula;
      
      case 'rollup':
        return val.rollup;
      
      case 'unique_id':
        return val.unique_id;
      
      default:
        return val;
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
  }${statusMethods}

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
