import { Client } from '@notionhq/client';
import { Logger } from '../../src/utils/Logger';
import { getAllTestRecords, type TestRecord } from '../fixtures/testData';
import {
  CATEGORY_DATABASE_PROPERTIES,
  E2E_CATEGORY_SCHEMA,
  E2E_TEST_SCHEMA,
  TEST_DATABASE_PROPERTIES_BASE,
} from '../fixtures/testSchemas';

const logger = new Logger('E2E:DatabaseSetup');

export class DatabaseSetup {
  private client: Client;
  private rateLimitDelay: number;

  constructor(apiKey: string, rateLimitDelay = 350) {
    this.client = new Client({ auth: apiKey });
    this.rateLimitDelay = rateLimitDelay;
  }

  /**
   * Sleep for rate limiting
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Find existing test database by name
   */
  async findTestDatabase(name: string): Promise<string | null> {
    try {
      const response = await this.client.search({
        filter: {
          property: 'object',
          value: 'database',
        },
        query: name,
      });

      await this.sleep(this.rateLimitDelay);

      const database = response.results.find(
        (result) =>
          result.object === 'database' &&
          'title' in result &&
          'archived' in result &&
          !result.archived &&
          result.title.some((text) => text.plain_text === name)
      );

      return database?.id || null;
    } catch (error) {
      logger.error(
        `Failed to find test database: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Create category database for relation testing
   */
  async createCategoryDatabase(parentPageId: string): Promise<string> {
    try {
      logger.info('Creating category database...');

      const database = await this.client.databases.create({
        parent: { page_id: parentPageId },
        title: [
          {
            text: {
              content: E2E_CATEGORY_SCHEMA.notionName,
            },
          },
        ],
        properties: CATEGORY_DATABASE_PROPERTIES,
      });

      await this.sleep(this.rateLimitDelay);

      logger.info(`Category database created: ${database.id}`);
      return database.id;
    } catch (error) {
      logger.error(
        `Failed to create category database: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Create test database with relation to category database
   */
  async createTestDatabase(parentPageId: string, categoryDatabaseId: string): Promise<string> {
    try {
      logger.info('Creating test database with relation...');

      // Create database with base properties
      const database = await this.client.databases.create({
        parent: { page_id: parentPageId },
        title: [
          {
            text: {
              content: E2E_TEST_SCHEMA.notionName,
            },
          },
        ],
        properties: {
          ...TEST_DATABASE_PROPERTIES_BASE,
          カテゴリー: {
            relation: {
              database_id: categoryDatabaseId,
              type: 'dual_property' as const,
              // biome-ignore lint/suspicious/noExplicitAny: Notion API requires dynamic typing for dual_property
              dual_property: {} as any,
            },
          },
        },
      });

      await this.sleep(this.rateLimitDelay);

      logger.info(`Test database created with relation: ${database.id}`);
      return database.id;
    } catch (error) {
      logger.error(
        `Failed to create test database: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Create category records
   */
  async createCategories(categoryDatabaseId: string): Promise<string[]> {
    logger.info('Creating category records...');

    const categories = [
      { name: '開発', color: '青' },
      { name: 'デザイン', color: '赤' },
      { name: 'テスト', color: '緑' },
      { name: 'ドキュメント', color: '黄' },
    ];

    const categoryIds: string[] = [];

    for (const category of categories) {
      try {
        const page = await this.client.pages.create({
          parent: { database_id: categoryDatabaseId },
          properties: {
            名前: {
              title: [
                {
                  text: {
                    content: category.name,
                  },
                },
              ],
            },
            色: {
              select: {
                name: category.color,
              },
            },
          },
        });

        categoryIds.push(page.id);
        await this.sleep(this.rateLimitDelay);
      } catch (error) {
        logger.error(
          `Failed to create category: ${category.name} - ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    logger.info(`Created ${categoryIds.length} categories`);
    return categoryIds;
  }

  /**
   * Populate database with test data
   */
  async populateTestData(
    databaseId: string,
    records: TestRecord[],
    categoryIds?: string[]
  ): Promise<void> {
    logger.info(`Populating database with ${records.length} test records...`);

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      // Assign categories in round-robin fashion
      const categoryId = categoryIds ? categoryIds[i % categoryIds.length] : undefined;

      try {
        await this.createTestRecord(databaseId, record, categoryId);
        await this.sleep(this.rateLimitDelay);
      } catch (error) {
        logger.error(
          `Failed to create record: ${record.title} - ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    logger.info('Test data population complete');
  }

  /**
   * Create a single test record
   */
  private async createTestRecord(
    databaseId: string,
    record: TestRecord,
    categoryId?: string
  ): Promise<void> {
    // biome-ignore lint/suspicious/noExplicitAny: Notion API property values require dynamic typing
    const properties: any = {
      タイトル: {
        title: [
          {
            text: {
              content: record.title,
            },
          },
        ],
      },
      完了: {
        checkbox: record.completed,
      },
    };

    if (record.description) {
      // biome-ignore lint/complexity/useLiteralKeys: Japanese property names from Notion API
      properties['説明'] = {
        rich_text: [
          {
            text: {
              content: record.description,
            },
          },
        ],
      };
    }

    if (record.priority) {
      // biome-ignore lint/complexity/useLiteralKeys: Japanese property names from Notion API
      properties['優先度'] = {
        select: {
          name: record.priority,
        },
      };
    }

    if (record.tags && record.tags.length > 0) {
      // biome-ignore lint/complexity/useLiteralKeys: Japanese property names from Notion API
      properties['タグ'] = {
        multi_select: record.tags.map((tag) => ({ name: tag })),
      };
    }

    if (record.assignee && record.assignee.length > 0) {
      // biome-ignore lint/complexity/useLiteralKeys: Japanese property names from Notion API
      properties['担当者'] = {
        people: record.assignee.map((userId) => ({ id: userId })),
      };
    }

    if (record.progress !== undefined) {
      // biome-ignore lint/complexity/useLiteralKeys: Japanese property names from Notion API
      properties['進捗率'] = {
        number: record.progress / 100, // Convert percentage to decimal
      };
    }

    if (record.dueDate) {
      // biome-ignore lint/complexity/useLiteralKeys: Japanese property names from Notion API
      properties['期限'] = {
        date: {
          start: record.dueDate,
        },
      };
    }

    if (categoryId) {
      // biome-ignore lint/complexity/useLiteralKeys: Japanese property names from Notion API
      properties['カテゴリー'] = {
        relation: [
          {
            id: categoryId,
          },
        ],
      };
    }

    await this.client.pages.create({
      parent: { database_id: databaseId },
      properties,
    });
  }

  /**
   * Clean up test database (archive all pages)
   */
  async cleanupTestData(databaseId: string): Promise<void> {
    logger.info('Cleaning up test data...');

    try {
      // Query all pages in the database
      const response = await this.client.databases.query({
        database_id: databaseId,
      });

      await this.sleep(this.rateLimitDelay);

      // Archive each page
      for (const page of response.results) {
        if (page.object === 'page') {
          await this.client.pages.update({
            page_id: page.id,
            archived: true,
          });
          await this.sleep(this.rateLimitDelay);
        }
      }

      logger.info('Test data cleanup complete');
    } catch (error) {
      logger.error(
        `Failed to cleanup test data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Setup test databases and populate with data
   */
  async setup(
    parentPageId: string
  ): Promise<{ testDatabaseId: string; categoryDatabaseId: string }> {
    // First, create or find category database
    let categoryDatabaseId = await this.findTestDatabase(E2E_CATEGORY_SCHEMA.notionName);

    if (!categoryDatabaseId) {
      categoryDatabaseId = await this.createCategoryDatabase(parentPageId);
    } else {
      logger.info(`Using existing category database: ${categoryDatabaseId}`);
      await this.cleanupTestData(categoryDatabaseId);
    }

    // Create categories
    const categoryIds = await this.createCategories(categoryDatabaseId);

    // Then, create or find test database
    let testDatabaseId = await this.findTestDatabase(E2E_TEST_SCHEMA.notionName);

    if (!testDatabaseId) {
      // Create new database with relation
      testDatabaseId = await this.createTestDatabase(parentPageId, categoryDatabaseId);

      // Populate with test data
      await this.populateTestData(testDatabaseId, getAllTestRecords(), categoryIds);
    } else {
      logger.info(`Using existing test database: ${testDatabaseId}`);

      // Clean up existing data
      await this.cleanupTestData(testDatabaseId);

      // Repopulate with fresh test data
      await this.populateTestData(testDatabaseId, getAllTestRecords(), categoryIds);
    }

    return { testDatabaseId, categoryDatabaseId };
  }

  /**
   * Tear down test database (optional)
   */
  async teardown(databaseId: string, deleteDatabase = false): Promise<void> {
    if (deleteDatabase) {
      // Note: Notion API doesn't support database deletion
      // We can only archive all pages
      await this.cleanupTestData(databaseId);
      logger.warning('Database deletion is not supported by Notion API. Pages have been archived.');
    } else {
      await this.cleanupTestData(databaseId);
    }
  }
}
