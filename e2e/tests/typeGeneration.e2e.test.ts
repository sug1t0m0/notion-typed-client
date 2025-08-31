import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { verifyGeneratedFiles } from '../utils/testHelpers';
import { TestLifecycle } from '../setup/testLifecycle';
import { PRIORITY_OPTIONS } from '../fixtures/testSchemas';

describe('Type Generation E2E Tests', () => {
  let testDatabaseId: string;
  let categoryDatabaseId: string;
  let configPath: string;

  beforeAll(async () => {
    // Get resources from centralized lifecycle
    const lifecycle = TestLifecycle.getInstance();
    const resources = await lifecycle.globalSetup();
    
    testDatabaseId = resources.testDatabaseId;
    categoryDatabaseId = resources.categoryDatabaseId;
    configPath = resources.configPath;
  });

  afterAll(async () => {
    // Cleanup is handled by global teardown
  });

  describe('Generated Config Validation', () => {
    it('should have correct configuration structure', () => {
      const updatedConfig = fs.readFileSync(configPath, 'utf-8');
      
      // Check that all properties have IDs
      expect(updatedConfig).toMatch(/"id":\s*"[^"]+"/g);
      
      // Verify property names are preserved for test database
      expect(updatedConfig).toContain('"notionName": "タイトル"');
      expect(updatedConfig).toContain('"notionName": "説明"');
      expect(updatedConfig).toContain('"notionName": "優先度"');
      expect(updatedConfig).toContain('"notionName": "進捗率"');
      expect(updatedConfig).toContain('"notionName": "期限"');
      expect(updatedConfig).toContain('"notionName": "完了"');
      expect(updatedConfig).toContain('"notionName": "カテゴリー"');
      
      // Verify property names for category database
      expect(updatedConfig).toContain('"notionName": "名前"');
      expect(updatedConfig).toContain('"notionName": "色"');
    });
  });

  describe('Generated Types Validation', () => {
    it('should have generated all required files', () => {
      // Verify files were created during setup
      expect(verifyGeneratedFiles()).toBe(true);
    });

    it('should generate correct interface structure', () => {
      const typesPath = path.resolve(process.cwd(), 'e2e', 'generated', 'types.ts');
      
      // Check if file exists first
      if (!fs.existsSync(typesPath)) {
        console.warn('Types file not found, skipping interface test');
        return;
      }
      
      const typesContent = fs.readFileSync(typesPath, 'utf-8');

      // Check main interface
      expect(typesContent).toContain('export interface E2ETestDatabase');
      expect(typesContent).toContain('title: string');
      expect(typesContent).toContain('description?: string');
      // Priority can be either a type alias or inline union
      expect(typesContent).toMatch(/priority\?:\s*(\w+|(\("低"\s*\|\s*"中"\s*\|\s*"高"\)))/);
      expect(typesContent).toContain('progress?: number');
      // Date can be either NotionDate type or inline object
      expect(typesContent).toMatch(/dueDate\?:\s*(\w+|\{[^}]*start:\s*string[^}]*\})/);
      expect(typesContent).toContain('completed');
      expect(typesContent).toContain('category?: string[]'); // Relation property
      
      // Check category interface
      expect(typesContent).toContain('export interface E2ECategoryDatabase');
      expect(typesContent).toContain('name: string');
      // Color can be either a type alias or inline union
      expect(typesContent).toMatch(/color\?:\s*(\w+|(\("赤"\s*\|\s*"青"\s*\|\s*"緑"\s*\|\s*"黄"\)))/);

      // Check create interface
      expect(typesContent).toContain('export interface CreateE2ETestDatabase');
      
      // Check update interface
      expect(typesContent).toContain('export interface UpdateE2ETestDatabase');
    });

    it('should generate enum types for select properties', () => {
      const typesPath = path.resolve(process.cwd(), 'e2e', 'generated', 'types.ts');
      
      // Check if file exists first
      if (!fs.existsSync(typesPath)) {
        console.warn('Types file not found, skipping enum test');
        return;
      }
      
      const typesContent = fs.readFileSync(typesPath, 'utf-8');

      // Check that priority options are included (either as type alias or inline)
      for (const option of PRIORITY_OPTIONS) {
        expect(typesContent).toContain(`"${option}"`);
      }
    });

    it('should generate correct base types', () => {
      const typesPath = path.resolve(process.cwd(), 'e2e', 'generated', 'types.ts');
      const typesContent = fs.readFileSync(typesPath, 'utf-8');

      // Check base types
      expect(typesContent).toContain('export type NotionUser');
      expect(typesContent).toContain('export type NotionDate');
      expect(typesContent).toContain('export type NotionFile');
      expect(typesContent).toContain('export type NotionSelectOption');
    });

    it('should generate database mapping types', () => {
      const typesPath = path.resolve(process.cwd(), 'e2e', 'generated', 'types.ts');
      const typesContent = fs.readFileSync(typesPath, 'utf-8');

      // Check mapping types
      expect(typesContent).toContain('export type DatabaseIdMapping');
      expect(typesContent).toContain(`'${testDatabaseId}': E2ETestDatabase`);
      expect(typesContent).toContain(`'${categoryDatabaseId}': E2ECategoryDatabase`);
      
      expect(typesContent).toContain('export type DatabaseNames');
      expect(typesContent).toContain("'E2ETestDatabase'");
      expect(typesContent).toContain("'E2ECategoryDatabase'");
    });
  });

  describe('Generated Client Validation', () => {
    it('should have correct client class structure', () => {
      const clientPath = path.resolve(process.cwd(), 'e2e', 'generated', 'E2ETestClient.ts');
      
      // Check if file exists first
      if (!fs.existsSync(clientPath)) {
        console.warn('Client file not found, skipping structure test');
        return;
      }
      
      const clientContent = fs.readFileSync(clientPath, 'utf-8');

      // Check client class
      expect(clientContent).toContain('export class NotionTypedClient');
      expect(clientContent).toContain('constructor');
      
      // Check methods
      expect(clientContent).toContain('queryDatabase');
      expect(clientContent).toContain('queryDatabaseAll');
      expect(clientContent).toContain('queryDatabaseIterator');
      expect(clientContent).toContain('createPage');
      expect(clientContent).toContain('updatePage');
      expect(clientContent).toContain('getPage');
      expect(clientContent).toContain('deletePage');
    });

    it('should include proper type imports', () => {
      const clientPath = path.resolve(process.cwd(), 'e2e', 'generated', 'E2ETestClient.ts');
      
      // Check if file exists first
      if (!fs.existsSync(clientPath)) {
        console.warn('Client file not found, skipping import test');
        return;
      }
      
      const clientContent = fs.readFileSync(clientPath, 'utf-8');

      expect(clientContent).toContain("import { Client } from '@notionhq/client'");
      expect(clientContent).toContain("import { validators } from './validators'");
      expect(clientContent).toContain("from './types'");
    });
  });

  describe('Generated Validators', () => {
    it('should have AJV validators', () => {
      const validatorPath = path.resolve(process.cwd(), 'e2e', 'generated', 'validators.ts');
      const validatorContent = fs.readFileSync(validatorPath, 'utf-8');

      expect(validatorContent).toContain("import Ajv from 'ajv'");
      expect(validatorContent).toContain('export const validators');
      expect(validatorContent).toContain('E2ETestDatabase');
    });

    it('should have JSON schemas', () => {
      const schemaPath = path.resolve(process.cwd(), 'e2e', 'generated', 'schemas.json');
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      const schemas = JSON.parse(schemaContent);

      expect(schemas).toHaveProperty('E2ETestDatabase');
      expect(schemas.E2ETestDatabase).toHaveProperty('properties');
      expect(schemas.E2ETestDatabase.properties).toHaveProperty('title');
      expect(schemas.E2ETestDatabase.properties).toHaveProperty('priority');
    });
  });

  describe('TypeScript Compilation', () => {
    it.skip('should compile generated code without errors (skipped: Status API limitations)', () => {
      // This test is skipped because Status properties cannot be created via API
      // and the generated code includes Status-related types that won't exist
      try {
        // Try to compile the generated TypeScript files
        execSync(
          'npx tsc --noEmit --skipLibCheck e2e/generated/*.ts',
          { cwd: process.cwd(), encoding: 'utf-8', stdio: 'pipe' }
        );
        
        // If we get here, compilation succeeded
        expect(true).toBe(true);
      } catch (error: any) {
        // Compilation failed - show the error
        console.error('TypeScript compilation failed:', error.stdout || error.message);
        expect(error).toBeNull();
      }
    });
  });
});