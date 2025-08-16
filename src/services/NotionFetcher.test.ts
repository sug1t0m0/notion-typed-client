import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDatabaseConfig, mockDatabaseSchema } from '../__tests__/TestUtils';
import { NotionFetcher } from './NotionFetcher';

// Mock @notionhq/client
vi.mock('@notionhq/client', () => ({
  Client: vi.fn().mockImplementation(() => ({
    databases: {
      retrieve: vi.fn().mockResolvedValue(mockDatabaseSchema),
    },
    search: vi.fn().mockResolvedValue({
      results: [
        {
          id: 'mock-db-id-123',
          object: 'database',
          title: [
            {
              type: 'text',
              text: { content: 'Test Database' },
            },
          ],
        },
      ],
    }),
  })),
}));

describe('NotionFetcher', () => {
  let fetcher: NotionFetcher;

  beforeEach(() => {
    process.env.NOTION_API_KEY = 'test-api-key';
    fetcher = new NotionFetcher();
  });

  describe('fetchSchemas', () => {
    it('should fetch database schemas and resolve IDs', async () => {
      const result = await fetcher.fetchSchemas([mockDatabaseConfig]);

      expect(result.databases).toHaveLength(1);
      expect(result.databases[0].id).toBe('mock-db-id-123');
      expect(result.databases[0].name).toBe('TaskDatabase');
      expect(result.databases[0].properties).toHaveLength(9);
    });

    it('should extract select options correctly', async () => {
      const result = await fetcher.fetchSchemas([mockDatabaseConfig]);

      const statusProp = result.databases[0].properties.find((p) => p.name === 'status');
      expect(statusProp?.options).toBeDefined();
      expect(statusProp?.options).toHaveLength(3);
      expect(statusProp?.options?.[0]).toHaveProperty('name', 'Not Started');

      const priorityProp = result.databases[0].properties.find((p) => p.name === 'priority');
      expect(priorityProp?.options).toBeDefined();
      expect(priorityProp?.options).toHaveLength(3);
      expect(priorityProp?.options?.map((o: any) => o.name)).toContain('High');
    });

    it('should detect config updates', async () => {
      const result = await fetcher.fetchSchemas([mockDatabaseConfig]);

      expect(result.configUpdates).toHaveLength(1);
      expect(result.configUpdates[0].updates.id).toBe('mock-db-id-123');
      expect(result.configUpdates[0].updates.properties).toBeDefined();
    });

    it('should auto-detect property types when type is null', async () => {
      const configWithNullType = {
        ...mockDatabaseConfig,
        properties: [
          {
            id: null,
            name: 'title',
            displayName: 'タイトル',
            notionName: 'Title',
            type: null,
          },
        ],
      };

      const result = await fetcher.fetchSchemas([configWithNullType]);

      const titleProp = result.databases[0].properties.find((p) => p.name === 'title');
      expect(titleProp?.type).toBe('title');
    });
  });

  describe('error handling', () => {
    it('should throw error when API key is missing', () => {
      delete process.env.NOTION_API_KEY;

      expect(() => new NotionFetcher()).toThrow('Notion API key is required');
    });

    it('should continue processing when database is not found', async () => {
      // Create a new fetcher with mocked client that returns no results
      vi.resetModules();
      vi.doMock('@notionhq/client', () => ({
        Client: vi.fn().mockImplementation(() => ({
          databases: {
            retrieve: vi.fn().mockRejectedValue(new Error('Not found')),
          },
          search: vi.fn().mockResolvedValue({ results: [] }),
        })),
      }));

      const { NotionFetcher: MockedNotionFetcher } = await import('./NotionFetcher');
      const mockedFetcher = new MockedNotionFetcher();
      const result = await mockedFetcher.fetchSchemas([mockDatabaseConfig]);

      expect(result.databases).toHaveLength(0);
      expect(result.configUpdates).toHaveLength(0);
    });
  });
});
