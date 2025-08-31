import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@notionhq/client';
import { TestLifecycle } from '../setup/testLifecycle';
import { EXPECTED_FILTER_RESULTS } from '../fixtures/testData';

describe('Filter and Pagination E2E Tests', () => {
  let testDatabaseId: string;
  let categoryDatabaseId: string;
  let client: Client;
  let GeneratedClient: any;
  let typedClient: any;

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
  });

  afterAll(async () => {
    // Cleanup is handled by global teardown
  });

  describe('Single Property Filters', () => {
    it('should filter by select property (priority)', async () => {
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        filter: {
          property: 'priority',
          select: {
            equals: '高',
          },
        },
      });

      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThanOrEqual(EXPECTED_FILTER_RESULTS.highPriority);
      
      // Verify all results have high priority
      for (const page of result.results) {
        expect(page.properties.priority).toBe('高');
      }
    });

    it('should filter by checkbox property (completed)', async () => {
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        filter: {
          property: 'completed',
          checkbox: {
            equals: true,
          },
        },
      });

      expect(result.results).toBeDefined();
      
      // Verify all results are completed
      for (const page of result.results) {
        expect(page.properties.completed).toBe(true);
      }
    });

    it('should filter by number property (progress)', async () => {
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        filter: {
          property: 'progress',
          number: {
            greater_than_or_equal_to: 50,
          },
        },
      });

      expect(result.results).toBeDefined();
      
      // Verify all results have progress >= 50
      for (const page of result.results) {
        if (page.properties.progress !== null && page.properties.progress !== undefined) {
          expect(page.properties.progress).toBeGreaterThanOrEqual(50);
        }
      }
    });

    it('should filter by date property', async () => {
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        filter: {
          property: 'dueDate',
          date: {
            is_not_empty: true,
          },
        },
      });

      expect(result.results).toBeDefined();
      
      // Verify all results have a due date
      for (const page of result.results) {
        expect(page.properties.dueDate).toBeDefined();
        expect(page.properties.dueDate).not.toBeNull();
      }
    });

    it('should filter by title property', async () => {
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        filter: {
          property: 'title',
          title: {
            contains: 'タスク',
          },
        },
      });

      expect(result.results).toBeDefined();
      
      // Verify all results contain 'タスク' in title
      for (const page of result.results) {
        expect(page.properties.title).toContain('タスク');
      }
    });

    it('should filter for null values', async () => {
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        filter: {
          property: 'priority',
          select: {
            is_empty: true,
          },
        },
      });

      expect(result.results).toBeDefined();
      
      // Verify all results have no priority
      for (const page of result.results) {
        expect(page.properties.priority).toBeNull();
      }
    });
  });

  describe('Compound Filters', () => {
    it('should support AND filters', async () => {
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        filter: {
          and: [
            {
              property: 'priority',
              select: {
                equals: '高',
              },
            },
            {
              property: 'completed',
              checkbox: {
                equals: false,
              },
            },
          ],
        },
      });

      expect(result.results).toBeDefined();
      
      // Verify all results match both conditions
      for (const page of result.results) {
        expect(page.properties.priority).toBe('高');
        expect(page.properties.completed).toBe(false);
      }
    });

    it('should support OR filters', async () => {
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        filter: {
          or: [
            {
              property: 'priority',
              select: {
                equals: '高',
              },
            },
            {
              property: 'priority',
              select: {
                equals: '低',
              },
            },
          ],
        },
      });

      expect(result.results).toBeDefined();
      
      // Verify all results match at least one condition
      for (const page of result.results) {
        expect(['高', '低']).toContain(page.properties.priority);
      }
    });

    it('should support nested compound filters', async () => {
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        filter: {
          and: [
            {
              or: [
                {
                  property: 'priority',
                  select: {
                    equals: '高',
                  },
                },
                {
                  property: 'priority',
                  select: {
                    equals: '中',
                  },
                },
              ],
            },
            {
              property: 'completed',
              checkbox: {
                equals: false,
              },
            },
          ],
        },
      });

      expect(result.results).toBeDefined();
      
      // Verify all results match the nested conditions
      for (const page of result.results) {
        expect(['高', '中']).toContain(page.properties.priority);
        expect(page.properties.completed).toBe(false);
      }
    });
  });

  describe('Pagination', () => {
    it('should respect page_size parameter', async () => {
      const pageSize = 5;
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        page_size: pageSize,
      });

      expect(result.results).toBeDefined();
      expect(result.results.length).toBeLessThanOrEqual(pageSize);
    });

    it('should provide cursor for next page', async () => {
      const firstPage = await typedClient.queryDatabase('E2ETestDatabase', {
        page_size: 3,
      });

      expect(firstPage.results).toBeDefined();
      
      if (firstPage.has_more) {
        expect(firstPage.next_cursor).toBeDefined();
        expect(typeof firstPage.next_cursor).toBe('string');
        
        // Fetch next page using cursor
        const secondPage = await typedClient.queryDatabase('E2ETestDatabase', {
          page_size: 3,
          start_cursor: firstPage.next_cursor,
        });
        
        expect(secondPage.results).toBeDefined();
        // Verify pages have different content
        expect(secondPage.results[0]?.id).not.toBe(firstPage.results[0]?.id);
      }
    });

    it('should fetch all pages with queryDatabaseAll', async () => {
      const allPages = await typedClient.queryDatabaseAll('E2ETestDatabase', {
        filter: {
          property: 'completed',
          checkbox: {
            equals: false,
          },
        },
      });

      expect(allPages).toBeDefined();
      expect(Array.isArray(allPages)).toBe(true);
      
      // Should have fetched all incomplete tasks
      expect(allPages.length).toBeGreaterThan(0);
      
      // Verify all are incomplete
      for (const page of allPages) {
        expect(page.properties.completed).toBe(false);
      }
    });

    it('should iterate through pages with queryDatabaseIterator', async () => {
      const pages: any[] = [];
      let count = 0;
      
      for await (const page of typedClient.queryDatabaseIterator('E2ETestDatabase', {
        page_size: 2,
        filter: {
          property: 'priority',
          select: {
            is_not_empty: true,
          },
        },
      })) {
        pages.push(page);
        count++;
        
        // Test early exit
        if (count >= 5) {
          break;
        }
      }

      expect(pages.length).toBe(5);
      
      // Verify all have priority set
      for (const page of pages) {
        expect(page.properties.priority).toBeDefined();
      }
    });
  });

  describe('Sorting', () => {
    it('should sort by single property ascending', async () => {
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        sorts: [
          {
            property: 'title',
            direction: 'ascending',
          },
        ],
      });

      expect(result.results).toBeDefined();
      
      // Verify ascending order
      for (let i = 1; i < result.results.length; i++) {
        const prev = result.results[i - 1].properties.title;
        const curr = result.results[i].properties.title;
        expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
      }
    });

    it('should sort by single property descending', async () => {
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        sorts: [
          {
            property: 'progress',
            direction: 'descending',
          },
        ],
        page_size: 5,
      });

      expect(result.results).toBeDefined();
      
      // Verify descending order (handling nulls)
      const nonNullResults = result.results.filter(r => r.properties.progress !== null && r.properties.progress !== undefined);
      
      for (let i = 1; i < nonNullResults.length; i++) {
        const prev = nonNullResults[i - 1].properties.progress;
        const curr = nonNullResults[i].properties.progress;
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it('should sort by multiple properties', async () => {
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        sorts: [
          {
            property: 'priority',
            direction: 'ascending',
          },
          {
            property: 'dueDate',
            direction: 'ascending',
          },
        ],
      });

      expect(result.results).toBeDefined();
      
      // Group by priority and check date ordering within each group
      const priorityGroups: { [key: string]: any[] } = {};
      
      for (const page of result.results) {
        const priority = page.properties.priority || 'none';
        if (!priorityGroups[priority]) {
          priorityGroups[priority] = [];
        }
        priorityGroups[priority].push(page);
      }
      
      // Verify date ordering within each priority group
      for (const pages of Object.values(priorityGroups)) {
        const datedPages = pages.filter(p => p.properties.dueDate);
        
        for (let i = 1; i < datedPages.length; i++) {
          const prev = new Date(datedPages[i - 1].properties.dueDate.start);
          const curr = new Date(datedPages[i].properties.dueDate.start);
          expect(prev.getTime()).toBeLessThanOrEqual(curr.getTime());
        }
      }
    });

    it('should handle property name conversion in sorts', async () => {
      // Test that code names are converted to Notion property names
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        sorts: [
          {
            property: 'dueDate', // Code name
            direction: 'ascending',
          },
        ],
        page_size: 5,
      });

      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
    });
  });

  describe('Combined Operations', () => {
    it('should filter, sort, and paginate together', async () => {
      const result = await typedClient.queryDatabase('E2ETestDatabase', {
        filter: {
          property: 'completed',
          checkbox: {
            equals: false,
          },
        },
        sorts: [
          {
            property: 'priority',
            direction: 'ascending',
          },
        ],
        page_size: 3,
      });

      expect(result.results).toBeDefined();
      expect(result.results.length).toBeLessThanOrEqual(3);
      
      // Verify all are incomplete
      for (const page of result.results) {
        expect(page.properties.completed).toBe(false);
      }
    });

    it('should handle complex queries with queryDatabaseAll', async () => {
      const allPages = await typedClient.queryDatabaseAll('E2ETestDatabase', {
        filter: {
          and: [
            {
              property: 'progress',
              number: {
                greater_than: 0,
              },
            },
            {
              property: 'dueDate',
              date: {
                is_not_empty: true,
              },
            },
          ],
        },
        sorts: [
          {
            property: 'progress',
            direction: 'descending',
          },
        ],
      });

      expect(allPages).toBeDefined();
      
      // Verify filter conditions
      for (const page of allPages) {
        expect(page.properties.progress).toBeGreaterThan(0);
        expect(page.properties.dueDate).toBeDefined();
      }
      
      // Verify sort order
      for (let i = 1; i < allPages.length; i++) {
        expect(allPages[i - 1].properties.progress).toBeGreaterThanOrEqual(allPages[i].properties.progress);
      }
    });
  });
});