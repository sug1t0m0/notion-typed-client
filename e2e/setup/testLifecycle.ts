/**
 * Centralized test lifecycle management for E2E tests
 * This module ensures consistent setup and teardown across all test suites
 */

import { Client } from '@notionhq/client';
import { E2E_CONFIG } from './testEnvironment';
import { DatabaseSetup } from './databaseSetup';
import { E2ETypeGenerator } from '../utils/typeGenerator';

export class TestLifecycle {
  private static instance: TestLifecycle | null = null;
  private static setupComplete = false;
  private static configPath: string | null = null;
  private static testDatabaseId: string | null = null;
  private static categoryDatabaseId: string | null = null;
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
    GeneratedClient: any;
  }> {
    // Return cached setup if already complete
    if (TestLifecycle.setupComplete) {
      console.log('✅ Using cached E2E test setup');
      return {
        testDatabaseId: TestLifecycle.testDatabaseId!,
        categoryDatabaseId: TestLifecycle.categoryDatabaseId!,
        configPath: TestLifecycle.configPath!,
        client: TestLifecycle.notionClient!,
        GeneratedClient: TestLifecycle.generatedClient!,
      };
    }

    console.log('🚀 Starting global E2E test setup...');

    // 1. Setup databases
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

    // 5. Initialize Notion client
    TestLifecycle.notionClient = new Client({ auth: E2E_CONFIG.apiKey });

    // 6. Import generated client
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
      testDatabaseId: TestLifecycle.testDatabaseId!,
      categoryDatabaseId: TestLifecycle.categoryDatabaseId!,
      configPath: TestLifecycle.configPath!,
      client: TestLifecycle.notionClient!,
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
