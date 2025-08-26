import { beforeEach, describe, expect, it } from 'vitest';
import type { ResolvedDatabaseConfig } from '../types';
import { ClientGenerator } from './ClientGenerator';

describe('ClientGenerator - Pagination Methods', () => {
  let generator: ClientGenerator;
  const testDatabases: ResolvedDatabaseConfig[] = [
    {
      id: 'task-db-id',
      name: 'tasks',
      notionName: 'Tasks DB',
      displayName: 'Tasks',
      properties: [
        {
          id: 'title-id',
          type: 'title',
          name: 'title',
          notionName: 'Title',
          displayName: 'Title',
        },
        {
          id: 'status-id',
          type: 'select',
          name: 'status',
          notionName: 'Status',
          displayName: 'Status',
          options: [
            { id: 'todo-id', name: 'todo', color: 'gray' },
            { id: 'done-id', name: 'done', color: 'green' },
          ],
        },
      ],
    },
  ];

  beforeEach(() => {
    generator = new ClientGenerator();
  });

  describe('Code Generation', () => {
    it('should generate queryDatabaseAll method', () => {
      const code = generator.generateClient(testDatabases);

      expect(code).toContain('async queryDatabaseAll<T extends DatabaseNames>');
      expect(code).toContain('while (hasMore)');
      expect(code).toContain('allResults.push(...response.results)');
      expect(code).toContain('return allResults');
    });

    it('should generate queryDatabaseIterator method', () => {
      const code = generator.generateClient(testDatabases);

      expect(code).toContain('async *queryDatabaseIterator<T extends DatabaseNames>');
      expect(code).toContain('AsyncGenerator<');
      expect(code).toContain('for (const item of response.results)');
      expect(code).toContain('yield item');
    });

    it('should include proper JSDoc comments', () => {
      const code = generator.generateClient(testDatabases);

      expect(code).toContain('Query all pages from a database (fetches all pages automatically)');
      expect(code).toContain('⚠️ Use with caution for large datasets');
      expect(code).toContain(
        'Query a database with an async iterator for memory-efficient processing'
      );
      expect(code).toContain('Ideal for batch processing and large datasets');
    });

    it('should maintain type safety in generated methods', () => {
      const code = generator.generateClient(testDatabases);

      // Check queryDatabaseAll return type
      expect(code).toMatch(
        /Promise<Array<\{[\s\S]*?id: string;[\s\S]*?properties: GetDatabaseTypeByName<T>;[\s\S]*?\}>>/
      );

      // Check queryDatabaseIterator return type
      expect(code).toMatch(
        /AsyncGenerator<\{[\s\S]*?id: string;[\s\S]*?properties: GetDatabaseTypeByName<T>;[\s\S]*?\}, void, unknown>/
      );
    });

    it('should use queryDatabase internally', () => {
      const code = generator.generateClient(testDatabases);

      // Both methods should call queryDatabase internally
      const queryDatabaseAllMatch = code.match(
        /async queryDatabaseAll[\s\S]*?await this\.queryDatabase/
      );
      const queryDatabaseIteratorMatch = code.match(
        /async \*queryDatabaseIterator[\s\S]*?await this\.queryDatabase/
      );

      expect(queryDatabaseAllMatch).toBeTruthy();
      expect(queryDatabaseIteratorMatch).toBeTruthy();
    });

    it('should handle cursor management correctly', () => {
      const code = generator.generateClient(testDatabases);

      // Check cursor initialization
      expect(code).toContain('let cursor: string | undefined = undefined');

      // Check cursor update
      expect(code).toContain('cursor = response.next_cursor || undefined');

      // Check hasMore handling
      expect(code).toContain('hasMore = response.has_more');
    });

    it('should exclude start_cursor from args in new methods', () => {
      const code = generator.generateClient(testDatabases);

      // queryDatabaseAll should not accept start_cursor
      expect(code).toMatch(
        /queryDatabaseAll[\s\S]*?args\?: \{[\s\S]*?filter\?: GetFilterType<T>;[\s\S]*?sorts\?: Sort\[\];[\s\S]*?page_size\?: number;[\s\S]*?\}/
      );

      // queryDatabaseIterator should not accept start_cursor
      expect(code).toMatch(
        /queryDatabaseIterator[\s\S]*?args\?: \{[\s\S]*?filter\?: GetFilterType<T>;[\s\S]*?sorts\?: Sort\[\];[\s\S]*?page_size\?: number;[\s\S]*?\}/
      );
    });

    it('should use default page_size of 100', () => {
      const code = generator.generateClient(testDatabases);

      expect(code).toContain('args?.page_size || 100');
    });
  });

  describe('Generated Method Structure', () => {
    it('queryDatabaseAll should collect all results', () => {
      const code = generator.generateClient(testDatabases);

      // Check structure of queryDatabaseAll
      expect(code).toContain('const allResults: Array<{');
      expect(code).toContain('allResults.push(...response.results)');
      expect(code).toContain('return allResults');
    });

    it('queryDatabaseIterator should yield items one by one', () => {
      const code = generator.generateClient(testDatabases);

      // Check structure of queryDatabaseIterator
      expect(code).toContain('for (const item of response.results) {');
      expect(code).toContain('yield item');
    });

    it('both methods should break when has_more is false', () => {
      const code = generator.generateClient(testDatabases);

      // Check loop termination condition
      expect(code).toMatch(/hasMore = response\.has_more/);
      expect(code).toMatch(/while \(hasMore\)/);
    });
  });
});
