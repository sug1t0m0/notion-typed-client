import { Client } from '@notionhq/client';
import type { QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';
import { E2E_CONFIG } from '../setup/testEnvironment';

/**
 * Extended Notion client for E2E testing with automatic rate limiting
 */
export class NotionTestClient extends Client {
  private rateLimitDelay: number;

  constructor() {
    super({ auth: E2E_CONFIG.apiKey });
    this.rateLimitDelay = E2E_CONFIG.rateLimitDelay;
  }

  /**
   * Sleep for rate limiting
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Query database with automatic rate limiting
   */
  async queryDatabaseWithDelay(params: QueryDatabaseParameters): Promise<any> {
    const result = await this.databases.query(params);
    await this.sleep(this.rateLimitDelay);
    return result;
  }

  /**
   * Create page with automatic rate limiting
   */
  async createPageWithDelay(params: any): Promise<any> {
    const result = await this.pages.create(params);
    await this.sleep(this.rateLimitDelay);
    return result;
  }

  /**
   * Update page with automatic rate limiting
   */
  async updatePageWithDelay(params: any): Promise<any> {
    const result = await this.pages.update(params);
    await this.sleep(this.rateLimitDelay);
    return result;
  }

  /**
   * Retrieve page with automatic rate limiting
   */
  async retrievePageWithDelay(pageId: string): Promise<any> {
    const result = await this.pages.retrieve({ page_id: pageId });
    await this.sleep(this.rateLimitDelay);
    return result;
  }

  /**
   * Retrieve database with automatic rate limiting
   */
  async retrieveDatabaseWithDelay(databaseId: string): Promise<any> {
    const result = await this.databases.retrieve({ database_id: databaseId });
    await this.sleep(this.rateLimitDelay);
    return result;
  }

  /**
   * Count pages in database
   */
  async countPages(databaseId: string, filter?: any): Promise<number> {
    let count = 0;
    let hasMore = true;
    let cursor: string | undefined;

    while (hasMore) {
      const response = await this.queryDatabaseWithDelay({
        database_id: databaseId,
        filter,
        start_cursor: cursor,
        page_size: 100,
      });

      count += response.results.length;
      hasMore = response.has_more;
      cursor = response.next_cursor ?? undefined;
    }

    return count;
  }

  /**
   * Get all pages from database
   */
  async getAllPages(databaseId: string, filter?: any): Promise<any[]> {
    const pages: any[] = [];
    let hasMore = true;
    let cursor: string | undefined;

    while (hasMore) {
      const response = await this.queryDatabaseWithDelay({
        database_id: databaseId,
        filter,
        start_cursor: cursor,
        page_size: 100,
      });

      pages.push(...response.results);
      hasMore = response.has_more;
      cursor = response.next_cursor ?? undefined;
    }

    return pages;
  }
}
