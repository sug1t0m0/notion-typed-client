import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from '@notionhq/client';
import { rateLimitDelay } from '../utils/testHelpers';
import { TestLifecycle } from '../setup/testLifecycle';
import { CRUD_TEST_RECORDS } from '../fixtures/testData';
import { E2E_CONFIG } from '../setup/testEnvironment';
import type { NotionTypedClient } from '../generated/E2ETestClient';

describe('CRUD Operations E2E Tests', () => {
  let databaseId: string;
  let client: Client;
  let GeneratedClient: typeof NotionTypedClient;
  let typedClient: NotionTypedClient;
  let createdPageId: string;
  let updatePageId: string;
  let deletePageId: string;

  beforeAll(async () => {
    // Get resources from centralized lifecycle
    const lifecycle = TestLifecycle.getInstance();
    const resources = await lifecycle.globalSetup();

    databaseId = resources.testDatabaseId;
    client = resources.client;
    GeneratedClient = resources.GeneratedClient;

    // Create typed client instance
    typedClient = new GeneratedClient({ client });

    // Find pre-existing pages for update and delete tests
    const response = await client.databases.query({
      database_id: databaseId,
      page_size: 100,
    });

    const pages = response.results.filter((p): p is any => p.object === 'page');

    // Find update and delete test records
    const updatePage = pages.find(
      (p) => p.properties['タイトル']?.title?.[0]?.text?.content === CRUD_TEST_RECORDS.update.title
    );
    const deletePage = pages.find(
      (p) => p.properties['タイトル']?.title?.[0]?.text?.content === CRUD_TEST_RECORDS.delete.title
    );

    if (updatePage) updatePageId = updatePage.id;
    if (deletePage) deletePageId = deletePage.id;
  }, E2E_CONFIG.timeout);

  afterAll(async () => {
    // Cleanup is handled by global teardown
    // Just clean up any test-specific resources if needed
  });

  describe('Create Operations', () => {
    it('should create a page with all properties including relation', async () => {
      const createData = CRUD_TEST_RECORDS.create;

      const created = await typedClient.createPage('E2ETestDatabase', {
        title: createData.title,
        description: createData.description,
        priority: createData.priority,
        progress: createData.progress,
        dueDate: createData.dueDate ? { start: createData.dueDate } : undefined,
        completed: createData.completed,
        // category relation can be set through the category database if needed
      });

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();

      createdPageId = created.id;

      // Verify created page
      await rateLimitDelay();
      const retrieved = await client.pages.retrieve({ page_id: createdPageId });

      expect(retrieved).toBeDefined();
      expect((retrieved as any).properties['タイトル']?.title?.[0]?.text?.content).toBe(
        createData.title
      );
    });

    it('should create a page with minimal properties', async () => {
      const minimal = await typedClient.createPage('E2ETestDatabase', {
        title: 'Minimal Task',
        completed: false,
      });

      expect(minimal).toBeDefined();
      expect(minimal.id).toBeDefined();

      // Clean up - archive the created page
      await rateLimitDelay();
      await client.pages.update({
        page_id: minimal.id,
        archived: true,
      });
    });

    it('should validate required properties', async () => {
      // This should fail because title is required
      await expect(
        // @ts-expect-error Testing validation - missing required 'title' property
        typedClient.createPage('E2ETestDatabase', {
          completed: false,
          // Missing required 'title' property
        })
      ).rejects.toThrow();
    });

    it('should validate property types', async () => {
      // This should fail due to type validation
      await expect(
        typedClient.createPage('E2ETestDatabase', {
          title: 'Test',
          // @ts-expect-error Testing validation - invalid priority value
          priority: 'Invalid Priority', // Not one of the valid options
          completed: false,
        })
      ).rejects.toThrow();
    });
  });

  describe('Read Operations', () => {
    it('should retrieve a page by ID', async () => {
      const page = await client.pages.retrieve({ page_id: createdPageId });

      expect(page).toBeDefined();
      expect(page.id).toBe(createdPageId);
      const props = (page as any).properties;
      expect(props['タイトル']?.title?.[0]?.text?.content).toBe(CRUD_TEST_RECORDS.create.title);
      expect(props['優先度']?.select?.name).toBe(CRUD_TEST_RECORDS.create.priority);
    });

    it('should retrieve database schema', async () => {
      const database = await client.databases.retrieve({
        database_id: databaseId,
      });

      expect(database).toBeDefined();
      expect(database.id).toBe(databaseId);
      if ('title' in database) {
        expect(database.title[0].plain_text).toBe('E2E Test Database');
      }

      // Verify properties exist
      const properties = Object.keys(database.properties);
      expect(properties).toContain('タイトル');
      expect(properties).toContain('説明');
      expect(properties).toContain('優先度');
      expect(properties).toContain('進捗率');
      expect(properties).toContain('期限');
      expect(properties).toContain('完了');
    });

    it('should query database with typed client', async () => {
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        page_size: 5,
      });

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Update Operations', () => {
    it('should update a single property', async () => {
      if (!updatePageId) {
        console.warn('Update test page not found, skipping test');
        return;
      }

      const updated = await typedClient.updatePage(updatePageId, 'E2ETestDatabase', {
        priority: '高', // Change from 中 to 高
      });

      expect(updated).toBeDefined();
      expect(updated.id).toBe(updatePageId);

      // Verify the update
      await rateLimitDelay();
      const retrieved = await client.pages.retrieve({ page_id: updatePageId });
      expect((retrieved as any).properties['優先度']?.select?.name).toBe('高');
    });

    it('should update multiple properties', async () => {
      if (!updatePageId) {
        console.warn('Update test page not found, skipping test');
        return;
      }

      const updated = await typedClient.updatePage(updatePageId, 'E2ETestDatabase', {
        description: 'Updated description',
        progress: 75,
        completed: true,
      });

      expect(updated).toBeDefined();

      // Verify the updates
      await rateLimitDelay();
      const retrieved = await client.pages.retrieve({ page_id: updatePageId });
      const props = (retrieved as any).properties;

      expect(props['説明']?.rich_text?.[0]?.text?.content).toBe('Updated description');
      expect(props['進捗率']?.number).toBe(75); // Notion stores as percentage
      expect(props['完了']?.checkbox).toBe(true);
    });

    it('should handle partial updates correctly', async () => {
      if (!updatePageId) {
        console.warn('Update test page not found, skipping test');
        return;
      }

      // Update only the title, other properties should remain unchanged
      const updated = await typedClient.updatePage(updatePageId, 'E2ETestDatabase', {
        title: 'Updated Title',
      });

      expect(updated).toBeDefined();

      // Verify only title changed
      await rateLimitDelay();
      const retrieved = await client.pages.retrieve({ page_id: updatePageId });
      const props = (retrieved as any).properties;

      expect(props['タイトル']?.title?.[0]?.text?.content).toBe('Updated Title');
      // These should remain from previous update
      expect(props['優先度']?.select?.name).toBe('高');
      expect(props['完了']?.checkbox).toBe(true);
    });
  });

  describe('Delete Operations', () => {
    it('should archive a page (soft delete)', async () => {
      if (!deletePageId) {
        console.warn('Delete test page not found, skipping test');
        return;
      }

      // Notion doesn't support hard delete, only archiving
      await client.pages.update({
        page_id: deletePageId,
        archived: true,
      });

      await rateLimitDelay();

      // Verify page is archived
      const retrieved = await client.pages.retrieve({ page_id: deletePageId });
      expect((retrieved as any).archived).toBe(true);
    });

    it('should exclude archived pages from queries', async () => {
      // Query should not include archived pages by default
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        page_size: 100,
      });

      const archivedPage = result.results.find((p: any) => p.id === deletePageId);
      expect(archivedPage).toBeUndefined();
    });

    it('should clean up created test page', async () => {
      if (createdPageId) {
        await client.pages.update({
          page_id: createdPageId,
          archived: true,
        });

        await rateLimitDelay();

        // Verify cleanup
        const retrieved = await client.pages.retrieve({ page_id: createdPageId });
        expect((retrieved as any).archived).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid page ID gracefully', async () => {
      await expect(client.pages.retrieve({ page_id: 'invalid-id-123' })).rejects.toThrow();
    });

    it('should handle invalid database name', async () => {
      await expect(
        // @ts-expect-error Testing error handling - invalid database name
        typedClient.queryDatabase('NonExistentDatabase', {})
      ).rejects.toThrow();
    });

    it('should validate data before sending to API', async () => {
      // Invalid date format
      await expect(
        typedClient.createPage('E2ETestDatabase', {
          title: 'Test',
          dueDate: { start: 'invalid-date' }, // Invalid date format
          completed: false,
        })
      ).rejects.toThrow();
    });
  });
});
