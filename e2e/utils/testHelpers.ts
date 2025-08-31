import { Client } from '@notionhq/client';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { E2E_CONFIG } from '../setup/testEnvironment';
import { DatabaseSetup } from '../setup/databaseSetup';
import { E2E_TEST_SCHEMA, E2E_CATEGORY_SCHEMA } from '../fixtures/testSchemas';
import type { NotionTypedConfig } from '../../src/types';

/**
 * Helper functions for E2E tests
 */

/**
 * Create test configuration file
 */
export function createTestConfig(
  testDatabaseId: string, 
  categoryDatabaseId: string
): NotionTypedConfig {
  const config: NotionTypedConfig = {
    databases: [
      {
        ...E2E_TEST_SCHEMA,
        id: testDatabaseId,
      },
      {
        ...E2E_CATEGORY_SCHEMA,
        id: categoryDatabaseId,
      },
    ],
    output: {
      path: './e2e/generated',
      clientName: 'E2ETestClient',
    },
  };

  return config;
}

/**
 * Write test configuration to file
 */
export function writeTestConfig(config: NotionTypedConfig): string {
  // Always use the same config file name for consistency
  const configPath = path.resolve(process.cwd(), 'e2e', 'test.notion-typed.config.ts');
  const configContent = `import type { NotionTypedConfig } from '../src/types';

const config: NotionTypedConfig = ${JSON.stringify(config, null, 2)};

export default config;
`;

  fs.writeFileSync(configPath, configContent);
  return configPath;
}

/**
 * Clean up generated files
 */
export function cleanupGeneratedFiles(): void {
  const generatedPath = path.resolve(process.cwd(), 'e2e', 'generated');
  
  if (fs.existsSync(generatedPath)) {
    fs.rmSync(generatedPath, { recursive: true, force: true });
  }

  // Clean up all possible config files
  const configPaths = [
    path.resolve(process.cwd(), 'e2e', 'test.notion-typed.config.ts'),
    path.resolve(process.cwd(), 'e2e', 'test-direct.config.ts'),
  ];
  
  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  }
}

/**
 * Wait for rate limiting
 */
export async function rateLimitDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, E2E_CONFIG.rateLimitDelay));
}

/**
 * Create Notion client for tests
 */
export function createTestClient(): Client {
  return new Client({ auth: E2E_CONFIG.apiKey });
}

/**
 * Setup test databases and return their IDs
 */
export async function setupTestDatabases(): Promise<{
  testDatabaseId: string;
  categoryDatabaseId: string;
}> {
  const setup = new DatabaseSetup(E2E_CONFIG.apiKey, E2E_CONFIG.rateLimitDelay);
  
  // Always use parent page ID from configuration
  return await setup.setup(E2E_CONFIG.parentPageId);
}

/**
 * Tear down test database
 */
export async function teardownTestDatabase(databaseId: string): Promise<void> {
  if (E2E_CONFIG.cleanupOnSuccess) {
    const setup = new DatabaseSetup(E2E_CONFIG.apiKey, E2E_CONFIG.rateLimitDelay);
    await setup.teardown(databaseId, false);
  }
}

/**
 * Verify generated files exist
 */
export function verifyGeneratedFiles(): boolean {
  const generatedPath = path.resolve(process.cwd(), 'e2e', 'generated');
  const requiredFiles = ['types.ts', 'E2ETestClient.ts', 'validators.ts', 'schemas.json'];

  for (const file of requiredFiles) {
    const filePath = path.join(generatedPath, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Missing generated file: ${filePath}`);
      return false;
    }
  }

  return true;
}

/**
 * Import generated client dynamically
 */
export async function importGeneratedClient(): Promise<any> {
  const clientPath = path.resolve(process.cwd(), 'e2e', 'generated', 'client.ts');
  
  if (!fs.existsSync(clientPath)) {
    throw new Error('Generated client not found. Run type generation first.');
  }

  // Use dynamic import to load the generated client
  const module = await import(clientPath);
  return module.E2ETestClient;
}

/**
 * Compare two objects for equality (ignoring specific fields)
 */
export function compareObjects(
  actual: any,
  expected: any,
  ignoreFields: string[] = ['id', 'created_time', 'last_edited_time', 'created_by', 'last_edited_by']
): boolean {
  const cleanObject = (obj: any): any => {
    const cleaned = { ...obj };
    for (const field of ignoreFields) {
      delete cleaned[field];
    }
    return cleaned;
  };

  const actualCleaned = cleanObject(actual);
  const expectedCleaned = cleanObject(expected);

  return JSON.stringify(actualCleaned) === JSON.stringify(expectedCleaned);
}