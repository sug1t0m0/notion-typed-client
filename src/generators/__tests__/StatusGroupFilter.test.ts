import { describe, expect, it } from 'vitest';
import type { ResolvedDatabaseConfig } from '../../types';
import { ClientGenerator } from '../ClientGenerator';
import { TypeGenerator } from '../TypeGenerator';

describe('Status Group Filter Generation', () => {
  const mockDatabase: ResolvedDatabaseConfig = {
    id: 'test-db-id',
    name: 'TestDatabase',
    displayName: 'Test Database',
    notionName: 'Test Database',
    properties: [
      {
        id: 'title',
        name: 'title',
        displayName: 'Title',
        notionName: 'Title',
        type: 'title',
      },
      {
        id: 'status-1',
        name: 'projectStatus',
        displayName: 'Project Status',
        notionName: 'Project Status',
        type: 'status',
        options: [
          { id: 'opt-1', name: 'Not Started', color: 'gray' },
          { id: 'opt-2', name: 'Planning', color: 'blue' },
          { id: 'opt-3', name: 'In Progress', color: 'yellow' },
          { id: 'opt-4', name: 'Review', color: 'orange' },
          { id: 'opt-5', name: 'Complete', color: 'green' },
          { id: 'opt-6', name: 'Archived', color: 'brown' },
        ],
        groups: [
          {
            id: 'group-1',
            name: 'To-do',
            color: 'gray',
            option_ids: ['opt-1', 'opt-2'],
          },
          {
            id: 'group-2',
            name: 'In progress',
            color: 'blue',
            option_ids: ['opt-3', 'opt-4'],
          },
          {
            id: 'group-3',
            name: 'Complete',
            color: 'green',
            option_ids: ['opt-5', 'opt-6'],
          },
        ],
      },
    ],
  };

  describe('TypeGenerator', () => {
    it('should generate StatusGroupFilter type', async () => {
      const generator = new TypeGenerator();
      const types = await generator.generateTypes([mockDatabase]);

      expect(types).toContain('export type StatusGroupFilter<Groups extends string>');
      expect(types).toContain('| { equals: Groups }');
      expect(types).toContain('| { does_not_equal: Groups }');
      expect(types).toContain('| { in_any: Groups[] }');
      expect(types).toContain('| { not_in_any: Groups[] }');
    });

    it('should generate status groups enum type', async () => {
      const generator = new TypeGenerator();
      const types = await generator.generateTypes([mockDatabase]);

      expect(types).toContain('export type TestDatabaseProjectStatusGroups =');
      expect(types).toContain("| 'To-do'");
      expect(types).toContain("| 'In progress'");
      expect(types).toContain("| 'Complete'");
    });

    it('should generate group mapping types', async () => {
      const generator = new TypeGenerator();
      const types = await generator.generateTypes([mockDatabase]);

      // Group to options mapping
      expect(types).toContain('export type TestDatabaseProjectStatusGroupMapping = {');
      expect(types).toContain("'To-do': 'Not Started' | 'Planning'");
      expect(types).toContain("'In progress': 'In Progress' | 'Review'");
      expect(types).toContain("'Complete': 'Complete' | 'Archived'");

      // Option to group mapping
      expect(types).toContain('export type TestDatabaseProjectStatusOptionToGroupMapping = {');
      expect(types).toContain("'Not Started': 'To-do'");
      expect(types).toContain("'Planning': 'To-do'");
      expect(types).toContain("'In Progress': 'In progress'");
    });

    it('should generate combined status filter with status_group', async () => {
      const generator = new TypeGenerator();
      const types = await generator.generateTypes([mockDatabase]);

      expect(types).toContain('export type TestDatabaseProjectStatusPropertyFilter = {');
      expect(types).toContain("property: 'projectStatus'");
      expect(types).toContain('status?: SelectFilter<TestDatabaseProjectStatusOptions>');
      expect(types).toContain('status_group?: StatusGroupFilter<TestDatabaseProjectStatusGroups>');
    });

    it('should generate StatusPropertyMapping type', async () => {
      const generator = new TypeGenerator();
      const types = await generator.generateTypes([mockDatabase]);

      expect(types).toContain('export type StatusPropertyMapping = {');
      expect(types).toContain("'TestDatabase': {");
      expect(types).toContain("'projectStatus': {");
      expect(types).toContain('groups: TestDatabaseProjectStatusGroups');
      expect(types).toContain('options: TestDatabaseProjectStatusOptions');
    });
  });

  describe('ClientGenerator', () => {
    it('should generate client with status group filter support', () => {
      const generator = new ClientGenerator();
      const client = generator.generateClient([mockDatabase]);

      expect(client).toContain('convertStatusGroupFilter');
      expect(client).toContain(
        "if ('status_group' in filterObj && propConfig.type === 'status' && propConfig.groups)"
      );
    });

    it('should include status property types in imports', () => {
      const generator = new ClientGenerator();
      const client = generator.generateClient([mockDatabase]);

      expect(client).toContain('GetStatusProperties');
      expect(client).toContain('GetStatusGroups');
      expect(client).toContain('GetStatusGroupMapping');
    });
  });

  describe('Filter Conversion Logic', () => {
    it('should handle equals group filter correctly', () => {
      const generator = new ClientGenerator();
      const client = generator.generateClient([mockDatabase]);

      // Check for equals conversion logic
      expect(client).toContain("case 'equals':");
      expect(client).toContain('// Group equals -> OR of all options in the group');
      expect(client).toContain('getOptionsForGroup(value as string)');
    });

    it('should handle in_any group filter correctly', () => {
      const generator = new ClientGenerator();
      const client = generator.generateClient([mockDatabase]);

      // Check for in_any conversion logic
      expect(client).toContain("case 'in_any':");
      expect(client).toContain('// in_any groups -> OR of all options in any of the groups');
      expect(client).toContain('const groupNames = value as string[]');
    });

    it('should handle not_in_any group filter correctly', () => {
      const generator = new ClientGenerator();
      const client = generator.generateClient([mockDatabase]);

      // Check for not_in_any conversion logic
      expect(client).toContain("case 'not_in_any':");
      expect(client).toContain('// not_in_any groups -> exclude all options in any of the groups');
      expect(client).toContain('getOptionsNotInGroups(groupNames)');
    });
  });
});
