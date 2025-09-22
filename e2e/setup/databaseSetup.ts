import { Client } from '@notionhq/client';
import { Logger } from '../../src/utils/Logger';
import { getAllTestRecords, type TestRecord } from '../fixtures/testData';
import { E2E_CATEGORY_SCHEMA, E2E_TEST_SCHEMA } from '../fixtures/testSchemas';
import { DatabaseValidator } from './DatabaseValidator';

const logger = new Logger('E2E:DatabaseSetup');

export class DatabaseSetup {
  private client: Client;
  private validator: DatabaseValidator;
  private rateLimitDelay: number;

  constructor(apiKey: string, rateLimitDelay = 350) {
    this.client = new Client({ auth: apiKey });
    this.validator = new DatabaseValidator(apiKey);
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
   * Validate database structure against expected schema
   */
  private async validateDatabaseStructure(
    testDatabaseId: string,
    categoryDatabaseId: string
  ): Promise<void> {
    const { testValidation, categoryValidation } = await this.validator.validateDatabases(
      testDatabaseId,
      categoryDatabaseId,
      E2E_TEST_SCHEMA,
      E2E_CATEGORY_SCHEMA
    );

    // Check if test database is valid
    if (!testValidation.isValid) {
      throw new Error(
        this.validator.formatValidationError(testValidation, E2E_TEST_SCHEMA.notionName)
      );
    }

    // Check if category database is valid
    if (!categoryValidation.isValid) {
      throw new Error(
        this.validator.formatValidationError(categoryValidation, E2E_CATEGORY_SCHEMA.notionName)
      );
    }

    // Log warnings if any
    if (testValidation.warnings.length > 0 || categoryValidation.warnings.length > 0) {
      logger.warning('Database validation completed with warnings');
    } else {
      logger.info('✅ Database validation completed successfully');
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
   * Databases must be created manually beforehand
   */
  async setup(
    _parentPageId: string
  ): Promise<{ testDatabaseId: string; categoryDatabaseId: string }> {
    logger.info('🔍 Looking for manually created test databases...');

    // Find category database (must exist)
    const categoryDatabaseId = await this.findTestDatabase(E2E_CATEGORY_SCHEMA.notionName);
    if (!categoryDatabaseId) {
      throw new Error(
        `❌ Category database "${E2E_CATEGORY_SCHEMA.notionName}" not found!\n\n` +
          `Please create the test databases manually before running E2E tests:\n` +
          `1. Create "${E2E_CATEGORY_SCHEMA.notionName}" database\n` +
          `2. Create "${E2E_TEST_SCHEMA.notionName}" database\n` +
          `3. Share both databases with your Notion integration\n` +
          `4. See e2e/DATABASE_TEMPLATE.md for the exact schema required\n`
      );
    }

    logger.info(`Found category database: ${categoryDatabaseId}`);

    // Find test database (must exist)
    const testDatabaseId = await this.findTestDatabase(E2E_TEST_SCHEMA.notionName);
    if (!testDatabaseId) {
      throw new Error(
        `❌ Test database "${E2E_TEST_SCHEMA.notionName}" not found!\n\n` +
          `Please create the test databases manually before running E2E tests:\n` +
          `1. Create "${E2E_CATEGORY_SCHEMA.notionName}" database\n` +
          `2. Create "${E2E_TEST_SCHEMA.notionName}" database\n` +
          `3. Share both databases with your Notion integration\n` +
          `4. See e2e/DATABASE_TEMPLATE.md for the exact schema required\n`
      );
    }

    logger.info(`Found test database: ${testDatabaseId}`);

    // Validate database structures
    logger.info('📋 Validating database structures...');
    await this.validateDatabaseStructure(testDatabaseId, categoryDatabaseId);

    // Clean up existing data
    logger.info('🧹 Cleaning up existing data...');
    await this.cleanupTestData(categoryDatabaseId);
    await this.cleanupTestData(testDatabaseId);

    // Create categories
    logger.info('📁 Creating category records...');
    const categoryIds = await this.createCategories(categoryDatabaseId);

    // Populate with test data
    logger.info('📝 Populating test data...');
    await this.populateTestData(testDatabaseId, getAllTestRecords(), categoryIds);

    logger.info('✅ Database setup completed successfully');
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
