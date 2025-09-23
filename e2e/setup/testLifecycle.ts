/**
 * Centralized test lifecycle management for E2E tests
 * This module ensures consistent setup and teardown across all test suites
 */

import { Client } from '@notionhq/client';
import { E2ETypeGenerator } from '../utils/typeGenerator';
import { DatabaseSetup } from './databaseSetup';
import { E2E_CONFIG } from './testEnvironment';

export class TestLifecycle {
  private static instance: TestLifecycle | null = null;
  private static setupComplete = false;
  private static configPath: string | null = null;
  private static testDatabaseId: string | null = null;
  private static categoryDatabaseId: string | null = null;
  // biome-ignore lint/suspicious/noExplicitAny: Generated client type loaded dynamically
  private static generatedClient: any = null;
  private static notionClient: Client | null = null;

  /**
   * Get singleton instance
   */
  static getInstance(): TestLifecycle {
    if (!TestLifecycle.instance) {
      TestLifecycle.instance = new TestLifecycle();
    }
    return TestLifecycle.instance;
  }

  /**
   * Global setup - called once before all tests
   */
  async globalSetup(): Promise<{
    testDatabaseId: string;
    categoryDatabaseId: string;
    configPath: string;
    client: Client;
    // biome-ignore lint/suspicious/noExplicitAny: Generated client type loaded dynamically
    GeneratedClient: any;
  }> {
    // Return cached setup if already complete
    if (TestLifecycle.setupComplete) {
      console.log('✅ Using cached E2E test setup');
      return {
        // biome-ignore lint/style/noNonNullAssertion: Values guaranteed when setupComplete is true
        testDatabaseId: TestLifecycle.testDatabaseId!,
        // biome-ignore lint/style/noNonNullAssertion: Values guaranteed when setupComplete is true
        categoryDatabaseId: TestLifecycle.categoryDatabaseId!,
        // biome-ignore lint/style/noNonNullAssertion: Values guaranteed when setupComplete is true
        configPath: TestLifecycle.configPath!,
        // biome-ignore lint/style/noNonNullAssertion: Values guaranteed when setupComplete is true
        client: TestLifecycle.notionClient!,
        // biome-ignore lint/style/noNonNullAssertion: Values guaranteed when setupComplete is true
        GeneratedClient: TestLifecycle.generatedClient!,
      };
    }

    console.log('🚀 Starting global E2E test setup...');

    try {
      // 1. Setup databases (validation and data population)
      const setup = new DatabaseSetup(E2E_CONFIG.apiKey, E2E_CONFIG.rateLimitDelay);
      const { testDatabaseId, categoryDatabaseId } = await setup.setup(E2E_CONFIG.parentPageId);
      TestLifecycle.testDatabaseId = testDatabaseId;
      TestLifecycle.categoryDatabaseId = categoryDatabaseId;

      // 2. Generate types and client using shared utility
      TestLifecycle.configPath = await E2ETypeGenerator.generateAll(
        testDatabaseId,
        categoryDatabaseId,
        E2E_CONFIG.apiKey,
        E2E_CONFIG.verboseLogging
      );

      // 3. Initialize Notion client
      TestLifecycle.notionClient = new Client({ auth: E2E_CONFIG.apiKey });

      // 4. Import generated client
      const clientModule = await import('../generated/E2ETestClient').catch(() => null);
      TestLifecycle.generatedClient = clientModule?.NotionTypedClient;

      TestLifecycle.setupComplete = true;
      console.log('✅ Global E2E test setup complete');

      return {
        testDatabaseId,
        categoryDatabaseId,
        configPath: TestLifecycle.configPath,
        client: TestLifecycle.notionClient,
        GeneratedClient: TestLifecycle.generatedClient,
      };
    } catch (error) {
      // Enhanced error handling with helpful messages
      console.error('❌ E2E test setup failed:');
      console.error(error instanceof Error ? error.message : String(error));

      if (error instanceof Error && error.message.includes('not found')) {
        console.error('\n📝 Please follow these steps:');
        console.error('1. Create the test databases in Notion UI');
        console.error('2. See e2e/DATABASE_TEMPLATE.md for exact schema');
        console.error('3. Share databases with your integration');
        console.error('4. Run the tests again\n');
      }

      throw error;
    }
  }

  /**
   * Global teardown - called once after all tests
   */
  async globalTeardown(): Promise<void> {
    if (!TestLifecycle.setupComplete) {
      return;
    }

    console.log('🧹 Starting global E2E test teardown...');

    if (E2E_CONFIG.cleanupOnSuccess) {
      // Clean up databases
      if (TestLifecycle.testDatabaseId) {
        const setup = new DatabaseSetup(E2E_CONFIG.apiKey, E2E_CONFIG.rateLimitDelay);
        await setup.teardown(TestLifecycle.testDatabaseId, false);
      }

      if (TestLifecycle.categoryDatabaseId) {
        const setup = new DatabaseSetup(E2E_CONFIG.apiKey, E2E_CONFIG.rateLimitDelay);
        await setup.teardown(TestLifecycle.categoryDatabaseId, false);
      }

      // Clean up generated files using shared utility
      E2ETypeGenerator.cleanupFiles();
    }

    // Reset state
    TestLifecycle.setupComplete = false;
    TestLifecycle.configPath = null;
    TestLifecycle.testDatabaseId = null;
    TestLifecycle.categoryDatabaseId = null;
    TestLifecycle.generatedClient = null;
    TestLifecycle.notionClient = null;

    console.log('✅ Global E2E test teardown complete');
  }

  /**
   * Get test resources (for use in individual tests)
   */
  getResources() {
    if (!TestLifecycle.setupComplete) {
      throw new Error('Test lifecycle not initialized. Call globalSetup() first.');
    }

    return {
      // biome-ignore lint/style/noNonNullAssertion: Values checked by setupComplete condition
      testDatabaseId: TestLifecycle.testDatabaseId!,
      // biome-ignore lint/style/noNonNullAssertion: Values checked by setupComplete condition
      categoryDatabaseId: TestLifecycle.categoryDatabaseId!,
      // biome-ignore lint/style/noNonNullAssertion: Values checked by setupComplete condition
      configPath: TestLifecycle.configPath!,
      // biome-ignore lint/style/noNonNullAssertion: Values checked by setupComplete condition
      client: TestLifecycle.notionClient!,
      // biome-ignore lint/style/noNonNullAssertion: Values checked by setupComplete condition
      GeneratedClient: TestLifecycle.generatedClient!,
    };
  }

  /**
   * Check if setup is complete
   */
  isSetupComplete(): boolean {
    return TestLifecycle.setupComplete;
  }
}
