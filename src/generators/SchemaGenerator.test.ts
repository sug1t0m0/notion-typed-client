import { describe, it, expect } from 'vitest';
import { SchemaGenerator } from './SchemaGenerator';
import { ResolvedDatabaseConfig } from '../types';

describe('SchemaGenerator', () => {
  const generator = new SchemaGenerator();

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
        name: 'tags',
        displayName: 'Tags',
        notionName: 'Tags',
        type: 'multi_select',
        options: [
          { id: 't1', name: 'bug', color: 'red' },
          { id: 't2', name: 'feature', color: 'blue' },
        ],
      },
      {
        id: 'prop-5',
        name: 'completed',
        displayName: 'Completed',
        notionName: 'Completed',
        type: 'checkbox',
      },
      {
        id: 'prop-6',
        name: 'estimate',
        displayName: 'Estimate',
        notionName: 'Estimate',
        type: 'number',
      },
    ],
  };

  describe('generateJSONSchema', () => {
    it('should generate valid JSON schema for database', () => {
      const schema = generator.generateJSONSchema(mockDatabase);

      expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
      expect(schema.type).toBe('object');
      expect(schema.title).toBe('TestDatabase');
      expect(schema.properties).toBeDefined();
      expect(schema.required).toContain('title');
      expect(schema.required).toContain('status');
    });

    it('should include enum values for select properties', () => {
      const schema = generator.generateJSONSchema(mockDatabase);

      const statusSchema = schema.properties.status;
      expect(statusSchema.oneOf[0].properties.name.enum).toEqual([
        'Not Started',
        'In Progress',
        'Done',
      ]);

      const prioritySchema = schema.properties.priority;
      expect(prioritySchema.oneOf[0].properties.name.enum).toEqual(['Low', 'Medium', 'High']);
    });

    it('should handle multi_select with array of enums', () => {
      const schema = generator.generateJSONSchema(mockDatabase);

      const tagsSchema = schema.properties.tags;
      expect(tagsSchema.type).toBe('array');
      expect(tagsSchema.items.properties.name.enum).toEqual(['bug', 'feature']);
    });
  });

  describe('generateCreateSchema', () => {
    it('should generate create schema with simplified types', () => {
      const schema = generator.generateCreateSchema(mockDatabase);

      expect(schema.title).toBe('CreateTestDatabase');
      expect(schema.required).toEqual(['title']); // Only title is required for creation
    });

    it('should use string enums for select in create schema', () => {
      const schema = generator.generateCreateSchema(mockDatabase);

      const statusSchema = schema.properties.status;
      expect(statusSchema.type).toBe('string');
      expect(statusSchema.enum).toEqual(['Not Started', 'In Progress', 'Done']);

      const prioritySchema = schema.properties.priority;
      expect(prioritySchema.type).toBe('string');
      expect(prioritySchema.enum).toEqual(['Low', 'Medium', 'High']);
    });

    it('should use array of string enums for multi_select', () => {
      const schema = generator.generateCreateSchema(mockDatabase);

      const tagsSchema = schema.properties.tags;
      expect(tagsSchema.type).toBe('array');
      expect(tagsSchema.items.type).toBe('string');
      expect(tagsSchema.items.enum).toEqual(['bug', 'feature']);
    });
  });

  describe('generateUpdateSchema', () => {
    it('should generate update schema with no required fields', () => {
      const schema = generator.generateUpdateSchema(mockDatabase);

      expect(schema.title).toBe('UpdateTestDatabase');
      expect(schema.required).toEqual([]); // No required fields for update
    });

    it('should have same property schemas as create schema', () => {
      const createSchema = generator.generateCreateSchema(mockDatabase);
      const updateSchema = generator.generateUpdateSchema(mockDatabase);

      expect(updateSchema.properties).toEqual(createSchema.properties);
    });
  });

  describe('property type handling', () => {
    it('should handle nullable types correctly', () => {
      const schema = generator.generateJSONSchema(mockDatabase);

      const numberSchema = schema.properties.estimate;
      expect(numberSchema.oneOf).toHaveLength(2);
      expect(numberSchema.oneOf[0].type).toBe('number');
      expect(numberSchema.oneOf[1].type).toBe('null');
    });

    it('should handle checkbox as boolean', () => {
      const schema = generator.generateJSONSchema(mockDatabase);

      const checkboxSchema = schema.properties.completed;
      expect(checkboxSchema.type).toBe('boolean');
    });

    it('should exclude read-only properties from create/update schemas', () => {
      const dbWithReadOnly: ResolvedDatabaseConfig = {
        ...mockDatabase,
        properties: [
          ...mockDatabase.properties,
          {
            id: 'prop-7',
            name: 'createdTime',
            displayName: 'Created Time',
            notionName: 'Created time',
            type: 'created_time',
          },
        ],
      };

      const createSchema = generator.generateCreateSchema(dbWithReadOnly);
      const updateSchema = generator.generateUpdateSchema(dbWithReadOnly);

      expect(createSchema.properties.createdTime).toBeUndefined();
      expect(updateSchema.properties.createdTime).toBeUndefined();
    });
  });
});
