import { describe, expect, it } from 'vitest';
import type { ResolvedDatabaseConfig } from '../types';
import { TypeGenerator } from './TypeGenerator';

describe('Filter Types Generation', () => {
  const generator = new TypeGenerator();

  const mockDatabase: ResolvedDatabaseConfig = {
    id: 'db-123',
    name: 'TestDatabase',
    displayName: 'Test Database',
    notionName: 'Test DB',
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
          { id: 's1', name: 'Not Started', color: 'gray' },
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
          { id: 'p2', name: 'Medium', color: 'yellow' },
          { id: 'p3', name: 'High', color: 'red' },
        ],
      },
      {
        id: 'prop-4',
        name: 'completed',
        displayName: 'Completed',
        notionName: 'Completed',
        type: 'checkbox',
      },
      {
        id: 'prop-5',
        name: 'dueDate',
        displayName: 'Due Date',
        notionName: 'Due Date',
        type: 'date',
      },
      {
        id: 'prop-6',
        name: 'assignee',
        displayName: 'Assignee',
        notionName: 'Assignee',
        type: 'people',
      },
      {
        id: 'prop-7',
        name: 'relatedTasks',
        displayName: 'Related Tasks',
        notionName: 'Related Tasks',
        type: 'relation',
      },
      {
        id: 'prop-8',
        name: 'taskId',
        displayName: 'Task ID',
        notionName: 'Task ID',
        type: 'unique_id',
      },
    ],
  };

  describe('generateFilterTypes', () => {
    it('should generate basic filter condition types', async () => {
      const types = await generator.generateTypes([mockDatabase]);

      // Check that basic filter types are generated
      expect(types).toContain('export type TextFilter');
      expect(types).toContain('export type NumberFilter');
      expect(types).toContain('export type CheckboxFilter');
      expect(types).toContain('export type DateFilter');
      expect(types).toContain('export type SelectFilter');
      expect(types).toContain('export type MultiSelectFilter');
      expect(types).toContain('export type PeopleFilter');
      expect(types).toContain('export type RelationFilter');
      expect(types).toContain('export type FormulaFilter');
      expect(types).toContain('export type RollupFilter');
      expect(types).toContain('export type TimestampFilter');
      expect(types).toContain('export type UniqueIdFilter');
    });

    it('should generate property-specific filter types', async () => {
      const types = await generator.generateTypes([mockDatabase]);

      // Check that property-specific filter types are generated
      expect(types).toContain('TestDatabaseTitlePropertyFilter');
      expect(types).toContain('TestDatabaseStatusPropertyFilter');
      expect(types).toContain('TestDatabasePriorityPropertyFilter');
      expect(types).toContain('TestDatabaseCompletedPropertyFilter');
      expect(types).toContain('TestDatabaseDueDatePropertyFilter');
      expect(types).toContain('TestDatabaseAssigneePropertyFilter');
      expect(types).toContain('TestDatabaseRelatedTasksPropertyFilter');
      expect(types).toContain('TestDatabaseTaskIdPropertyFilter');
    });

    it('should generate main database filter type', async () => {
      const types = await generator.generateTypes([mockDatabase]);

      // Check that main database filter type is generated
      expect(types).toContain('export type TestDatabaseFilter');
      expect(types).toContain('CompoundFilter<TestDatabaseFilterBase>');
    });

    it('should generate GetFilterType helper', async () => {
      const types = await generator.generateTypes([mockDatabase]);

      // Check that GetFilterType helper is generated
      expect(types).toContain('export type GetFilterType<T extends DatabaseNames>');
      expect(types).toContain("T extends 'TestDatabase' ? TestDatabaseFilter :");
    });

    it('should use enum types for select and status properties', async () => {
      const types = await generator.generateTypes([mockDatabase]);

      // Check that select and status properties use enum types
      expect(types).toContain('SelectFilter<TestDatabaseStatusOptions>');
      expect(types).toContain('SelectFilter<TestDatabasePriorityOptions>');
    });

    it('should generate compound filter support', async () => {
      const types = await generator.generateTypes([mockDatabase]);

      // Check that compound filter types are generated
      expect(types).toContain('export type CompoundFilter<T>');
      expect(types).toContain('and?: (T | CompoundFilter<T>)[]');
      expect(types).toContain('or?: (T | CompoundFilter<T>)[]');
    });

    it('should generate mutually exclusive filter conditions', async () => {
      const types = await generator.generateTypes([mockDatabase]);

      // Check that filters use union types for mutual exclusivity
      expect(types).toContain('| { equals: string }');
      expect(types).toContain('| { contains: string }');
      expect(types).toContain('| { is_empty: true }');
      expect(types).toContain('| { equals: number }');
      expect(types).toContain('| { greater_than: number }');
    });

    it('should support additional property types', async () => {
      const types = await generator.generateTypes([mockDatabase]);

      // Check that people and relation property types are supported
      expect(types).toContain('people: PeopleFilter');
      expect(types).toContain('relation: RelationFilter');
    });

    it('should generate special timestamp filters', async () => {
      const types = await generator.generateTypes([mockDatabase]);

      // Check that special timestamp filters are generated
      expect(types).toContain('TimestampCreatedTimeFilter');
      expect(types).toContain('TimestampLastEditedTimeFilter');
      expect(types).toContain("timestamp: 'created_time'");
      expect(types).toContain("timestamp: 'last_edited_time'");
    });

    it('should support unique_id filters', async () => {
      const types = await generator.generateTypes([mockDatabase]);

      // Check that unique_id filters are supported
      expect(types).toContain('unique_id: UniqueIdFilter');
    });
  });
});
