/**
 * Interface for Notion client to enable dependency injection
 * This allows injecting custom implementations or mock clients for testing
 */
export interface NotionClientInterface {
  /**
   * Database operations
   */
  databases: {
    /**
     * Retrieve database schema
     */
    retrieve(args: { database_id: string }): Promise<any>;
    
    /**
     * Query database pages
     */
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

  /**
   * Page operations
   */
  pages: {
    /**
     * Create a new page
     */
    create(args: {
      parent: { database_id: string };
      properties: any;
    }): Promise<any>;
    
    /**
     * Retrieve a page
     */
    retrieve(args: { page_id: string }): Promise<any>;
    
    /**
     * Update a page
     */
    update(args: {
      page_id: string;
      properties?: any;
      archived?: boolean;
    }): Promise<any>;
  };

  /**
   * Search functionality
   */
  search(args: {
    query?: string;
    filter?: {
      property: string;
      value: string;
    };
    sort?: {
      direction: 'ascending' | 'descending';
      timestamp: 'last_edited_time' | 'created_time';
    };
    start_cursor?: string;
    page_size?: number;
  }): Promise<{
    results: any[];
    has_more: boolean;
    next_cursor: string | null;
  }>;
}

/**
 * Constructor options for Notion client
 */
export interface NotionClientOptions {
  auth: string;
  baseUrl?: string;
  timeoutMs?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  agent?: any;
}

/**
 * Factory function type for creating Notion clients
 */
export type NotionClientFactory = (options: NotionClientOptions) => NotionClientInterface;