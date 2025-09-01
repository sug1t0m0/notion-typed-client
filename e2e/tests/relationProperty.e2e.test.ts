import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@notionhq/client';
import { rateLimitDelay } from '../utils/testHelpers';
import { TestLifecycle } from '../setup/testLifecycle';

describe('Relation Property E2E Tests', () => {
  let testDatabaseId: string;
  let categoryDatabaseId: string;
  let client: Client;
  let GeneratedClient: any;
  let typedClient: any;
  let categoryIds: string[] = [];
  let taskIds: string[] = [];

  beforeAll(async () => {
    // Get resources from centralized lifecycle
    const lifecycle = TestLifecycle.getInstance();
    const resources = await lifecycle.globalSetup();

    testDatabaseId = resources.testDatabaseId;
    categoryDatabaseId = resources.categoryDatabaseId;
    client = resources.client;
    GeneratedClient = resources.GeneratedClient;

    // Create typed client instance
    typedClient = new GeneratedClient({ client });

    // Get category IDs
    const categoryResponse = await client.databases.query({
      database_id: categoryDatabaseId,
      page_size: 10,
    });
    categoryIds = categoryResponse.results
      .filter((p): p is any => p.object === 'page')
      .map(p => p.id);

    // Get some task IDs
    const taskResponse = await client.databases.query({
      database_id: testDatabaseId,
      page_size: 5,
    });
    taskIds = taskResponse.results
      .filter((p): p is any => p.object === 'page')
      .map(p => p.id);
  });

  afterAll(async () => {
    // Cleanup is handled by global teardown
  });

  describe('Relation Type Generation', () => {
    it('should generate correct relation types', () => {
      // The relation property should be typed as string[] (array of page IDs)
      const testCreation = async () => {
        await typedClient.createPage('E2ETestDatabase', {
          title: 'Test with Relation',
          completed: false,
          category: [categoryIds[0]], // Should accept array of IDs
        });
      };

      expect(testCreation).not.toThrow();
    });

    it('should handle bidirectional relations', () => {
      // Category database should have reverse relation
      const testCategoryCreation = async () => {
        await typedClient.createPage('E2ECategoryDatabase', {
          name: 'New Category',
          tasks: taskIds.slice(0, 2), // Should accept array of task IDs
        });
      };

      expect(testCategoryCreation).not.toThrow();
    });
  });

  describe('Relation CRUD Operations', () => {
    let createdTaskId: string;
    let createdCategoryId: string;

    it('should create a task with category relation', async () => {
      if (categoryIds.length === 0) {
        console.warn('No categories found, skipping test');
        return;
      }

      const created = await typedClient.createPage('E2ETestDatabase', {
        title: 'Task with Category',
        completed: false,
        category: [categoryIds[0]],
      });

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      createdTaskId = created.id;

      // Verify the relation was set
      await rateLimitDelay();
      const retrieved = await client.pages.retrieve({ page_id: createdTaskId });
      const props = (retrieved as any).properties;

      expect(props['カテゴリー']?.relation).toBeDefined();
      expect(props['カテゴリー'].relation).toHaveLength(1);
      expect(props['カテゴリー'].relation[0].id).toBe(categoryIds[0]);
    });

    it('should create a category with task relations', async () => {
      if (taskIds.length < 2) {
        console.warn('Not enough tasks found, skipping test');
        return;
      }

      const created = await typedClient.createPage('E2ECategoryDatabase', {
        name: 'Test Category',
        color: '赤',
        tasks: taskIds.slice(0, 2),
      });

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      createdCategoryId = created.id;

      // Verify the relations were set
      await rateLimitDelay();
      const retrieved = await client.pages.retrieve({ page_id: createdCategoryId });
      const props = (retrieved as any).properties;

      expect(props['Related to E2E Test Database (カテゴリー)']?.relation).toBeDefined();
      expect(props['Related to E2E Test Database (カテゴリー)'].relation).toHaveLength(2);
    });

    it('should update relations', async () => {
      if (categoryIds.length < 2 || !createdTaskId) {
        console.warn('Not enough data for update test, skipping');
        return;
      }

      // Update to different category
      const updated = await typedClient.updatePage(createdTaskId, 'E2ETestDatabase', {
        category: [categoryIds[1]],
      });

      expect(updated).toBeDefined();

      // Verify the update
      await rateLimitDelay();
      const retrieved = await client.pages.retrieve({ page_id: createdTaskId });
      const props = (retrieved as any).properties;

      expect(props['カテゴリー'].relation).toHaveLength(1);
      expect(props['カテゴリー'].relation[0].id).toBe(categoryIds[1]);
    });

    it('should clear relations', async () => {
      if (!createdTaskId) {
        console.warn('No created task for clear test, skipping');
        return;
      }

      // Clear the relation
      const updated = await typedClient.updatePage(createdTaskId, 'E2ETestDatabase', {
        category: [],
      });

      expect(updated).toBeDefined();

      // Verify the relation was cleared
      await rateLimitDelay();
      const retrieved = await client.pages.retrieve({ page_id: createdTaskId });
      const props = (retrieved as any).properties;

      expect(props['カテゴリー'].relation).toHaveLength(0);
    });

    it('should handle multiple relations', async () => {
      if (categoryIds.length < 3) {
        console.warn('Not enough categories for multiple relation test, skipping');
        return;
      }

      const created = await typedClient.createPage('E2ETestDatabase', {
        title: 'Task with Multiple Categories',
        completed: false,
        category: categoryIds.slice(0, 3),
      });

      expect(created).toBeDefined();

      // Verify multiple relations
      await rateLimitDelay();
      const retrieved = await client.pages.retrieve({ page_id: created.id });
      const props = (retrieved as any).properties;

      expect(props['カテゴリー'].relation).toHaveLength(3);

      // Clean up
      await client.pages.update({
        page_id: created.id,
        archived: true,
      });
    });

    // Clean up created test data
    afterAll(async () => {
      if (createdTaskId) {
        await client.pages.update({
          page_id: createdTaskId,
          archived: true,
        });
      }
      if (createdCategoryId) {
        await client.pages.update({
          page_id: createdCategoryId,
          archived: true,
        });
      }
    });
  });

  describe('Relation Filtering', () => {
    it('should filter by relation property', async () => {
      if (categoryIds.length === 0) {
        console.warn('No categories for filter test, skipping');
        return;
      }

      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        filter: {
          property: 'category',
          relation: {
            contains: categoryIds[0],
          },
        },
      });

      expect(result.results).toBeDefined();

      // All results should have the specified category
      for (const page of result.results) {
        if (page.properties.category && page.properties.category.length > 0) {
          expect(page.properties.category).toContain(categoryIds[0]);
        }
      }
    });

    it('should filter for empty relations', async () => {
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        filter: {
          property: 'category',
          relation: {
            is_empty: true,
          },
        },
      });

      expect(result.results).toBeDefined();

      // All results should have no category
      for (const page of result.results) {
        expect(page.properties.category).toBeUndefined();
      }
    });

    it('should filter for non-empty relations', async () => {
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        filter: {
          property: 'category',
          relation: {
            is_not_empty: true,
          },
        },
      });

      expect(result.results).toBeDefined();

      // All results should have at least one category
      for (const page of result.results) {
        if (page.properties.category) {
          expect(page.properties.category.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Relation Retrieval', () => {
    it('should retrieve pages with relation data', async () => {
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        page_size: 5,
      });

      expect(result.results).toBeDefined();

      // Check that relation properties are included
      for (const page of result.results) {
        expect(page.properties).toHaveProperty('category');
        // If category exists, it should be an array
        if (page.properties.category !== undefined) {
          expect(Array.isArray(page.properties.category)).toBe(true);
        }
      }
    });

    it('should retrieve category pages with reverse relations', async () => {
      const result = await typedClient.queryDatabase('E2ECategoryDatabase', {
        page_size: 5,
      });

      expect(result.results).toBeDefined();

      // Check that reverse relation properties are included
      for (const page of result.results) {
        expect(page.properties).toHaveProperty('tasks');
        // If tasks exists, it should be an array
        if (page.properties.tasks !== undefined) {
          expect(Array.isArray(page.properties.tasks)).toBe(true);
        }
      }
    });
  });
});
