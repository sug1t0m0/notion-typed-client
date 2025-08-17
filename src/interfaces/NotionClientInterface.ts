import type { Client } from '@notionhq/client';

/**
 * Interface for Notion client to enable dependency injection
 * Extracts the essential methods from the official Notion client
 * This allows injecting custom implementations or mock clients for testing
 */
export interface NotionClientInterface {
  /**
   * Database operations
   */
  databases: Pick<Client['databases'], 'retrieve' | 'query'>;

  /**
   * Page operations
   */
  pages: Pick<Client['pages'], 'create' | 'retrieve' | 'update'>;

  /**
   * Search functionality
   */
  search: Client['search'];
}

/**
 * Extract constructor options from official Client
 */
export type NotionClientOptions = ConstructorParameters<typeof Client>[0];

/**
 * Factory function type for creating Notion clients
 */
export type NotionClientFactory = (options: NotionClientOptions) => NotionClientInterface;
