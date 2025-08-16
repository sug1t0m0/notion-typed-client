import { describe, it, expect } from 'vitest';
import { TypeGenerator } from './TypeGenerator';
import { ResolvedDatabaseConfig } from '../types';

describe('TypeGenerator', () => {
  const generator = new TypeGenerator();

  const mockDatabase: ResolvedDatabaseConfig = {
    id: 'db-123',
    name: 'TaskDatabase',
    displayName: 'Task Database',
    notionName: 'Tasks',
    properties: [
      {
        id: 'prop-1',
        name: 'title',
        displayName: 'Title',
        notionName: 'Title',
        type: 'title',
      },
      {
        id: 'prop-2',
        name: 'status',
        displayName: 'Status',
        notionName: 'Status',
        type: 'status',
        options: [
          { id: 's1', name: 'Todo', color: 'gray' },
          { id: 's2', name: 'In Progress', color: 'blue' },
          { id: 's3', name: 'Done', color: 'green' },
        ],
      },
      {
        id: 'prop-3',
        name: 'priority',
        displayName: 'Priority',
        notionName: 'Priority',
        type: 'select',
        options: [
          { id: 'p1', name: 'Low', color: 'gray' },
          { id: 'p2', name: 'High', color: 'red' },
        ],
      },
    ],
  };

  describe('generateTypes', () => {
    it('should generate TypeScript types from database config', async () => {
      const types = await generator.generateTypes([mockDatabase]);

      // Check base types are included
      expect(types).toContain('export type NotionUser');
      expect(types).toContain('export type NotionFile');
      expect(types).toContain('export type NotionDate');
      expect(types).toContain('export type NotionSelectOption');

      // Check database types are generated
      expect(types).toContain('export interface TaskDatabase');
      expect(types).toContain('export interface CreateTaskDatabase');
      expect(types).toContain('export interface UpdateTaskDatabase');
    });

    it('should generate enum types for select properties', async () => {
      const types = await generator.generateTypes([mockDatabase]);

      // Check enum types for status
      expect(types).toContain('export type TaskDatabaseStatusOptions');
      expect(types).toContain("| 'Todo'");
      expect(types).toContain("| 'In Progress'");
      expect(types).toContain("| 'Done'");

      // Check enum types for priority
      expect(types).toContain('export type TaskDatabasePriorityOptions');
      expect(types).toContain("| 'Low'");
      expect(types).toContain("| 'High'");
    });

    it('should generate database mapping types', async () => {
      const types = await generator.generateTypes([mockDatabase]);

      expect(types).toContain('export type DatabaseIdMapping');
      expect(types).toContain("'db-123': TaskDatabase");
      expect(types).toContain('export type DatabaseNames');
      expect(types).toContain("| 'TaskDatabase'");
    });

    it('should handle special characters in enum values', async () => {
      const dbWithSpecialChars: ResolvedDatabaseConfig = {
        ...mockDatabase,
        properties: [
          {
            id: 'prop-1',
            name: 'category',
            displayName: 'Category',
            notionName: 'Category',
            type: 'select',
            options: [
              { id: 'c1', name: "Won't Fix", color: 'gray' },
              { id: 'c2', name: 'High-Priority', color: 'red' },
            ],
          },
        ],
      };

      const types = await generator.generateTypes([dbWithSpecialChars]);

      expect(types).toContain("| 'Won\\'t Fix'");
      expect(types).toContain("| 'High-Priority'");
    });

    it('should generate helper types for multiple databases', async () => {
      const secondDatabase: ResolvedDatabaseConfig = {
        id: 'db-456',
        name: 'ProjectDatabase',
        displayName: 'Project Database',
        notionName: 'Projects',
        properties: [
          {
            id: 'prop-1',
            name: 'name',
            displayName: 'Name',
            notionName: 'Name',
            type: 'title',
          },
        ],
      };

      const types = await generator.generateTypes([mockDatabase, secondDatabase]);

      // Check both databases are in the mapping
      expect(types).toContain("'db-123': TaskDatabase");
      expect(types).toContain("'db-456': ProjectDatabase");

      // Check conditional types
      expect(types).toContain("T extends 'TaskDatabase' ? CreateTaskDatabase");
      expect(types).toContain("T extends 'ProjectDatabase' ? CreateProjectDatabase");
    });
  });

  describe('generateBaseTypes', () => {
    it('should include all necessary base types', async () => {
      const types = await generator.generateTypes([]);

      expect(types).toContain('NotionUser');
      expect(types).toContain('NotionFile');
      expect(types).toContain('NotionDate');
      expect(types).toContain('NotionSelectOption');

      // Check type structure
      expect(types).toMatch(/id\s*:\s*string/);
      expect(types).toMatch(/name\s*:\s*string/);
      expect(types).toMatch(/start\s*:\s*string/);
      expect(types).toMatch(/end\?\s*:\s*string\s*\|\s*null/);
    });
  });
});
