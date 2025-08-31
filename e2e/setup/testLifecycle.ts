/**
 * Centralized test lifecycle management for E2E tests
 * This module ensures consistent setup and teardown across all test suites
 */

import { Client } from '@notionhq/client';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { E2E_CONFIG } from './testEnvironment';
import { DatabaseSetup } from './databaseSetup';
import { E2E_TEST_SCHEMA, E2E_CATEGORY_SCHEMA } from '../fixtures/testSchemas';
import type { NotionTypedConfig } from '../../src/types';

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

    // 2. Create configuration with all properties
    const config = this.createCompleteConfig(testDatabaseId, categoryDatabaseId);
    
    // 3. Write configuration to file
    TestLifecycle.configPath = this.writeConfig(config);

    // 4. Build types and client
    this.buildTypesAndClient(TestLifecycle.configPath);

    // 5. Initialize Notion client
    TestLifecycle.notionClient = new Client({ auth: E2E_CONFIG.apiKey });

    // 6. Import generated client
    const clientModule = await import('../generated/E2ETestClient');
    TestLifecycle.generatedClient = clientModule.NotionTypedClient;

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

      // Clean up generated files
      this.cleanupFiles();
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
   * Create complete configuration with all properties
   */
  private createCompleteConfig(
    testDatabaseId: string,
    categoryDatabaseId: string
  ): NotionTypedConfig {
    return {
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
  }

  /**
   * Write configuration to file
   */
  private writeConfig(config: NotionTypedConfig): string {
    const configPath = path.resolve(process.cwd(), 'e2e', 'e2e.notion-typed.config.ts');
    const configContent = `import type { NotionTypedConfig } from '../src/types';

const config: NotionTypedConfig = ${JSON.stringify(config, null, 2)};

export default config;`;

    fs.writeFileSync(configPath, configContent);
    return configPath;
  }

  /**
   * Build types and client from configuration
   */
  private buildTypesAndClient(configPath: string): void {
    console.log('🔨 Building types and client...');
    
    const output = execSync(
      `echo "y" | npx ts-node src/cli.ts build --config ${configPath}`,
      {
        cwd: process.cwd(),
        encoding: 'utf-8',
        env: { ...process.env, NOTION_API_KEY: E2E_CONFIG.apiKey },
        shell: true,
      }
    );

    if (E2E_CONFIG.verboseLogging) {
      console.log(output);
    }
  }

  /**
   * Clean up generated files and configuration
   */
  private cleanupFiles(): void {
    // Clean up generated directory
    const generatedPath = path.resolve(process.cwd(), 'e2e', 'generated');
    if (fs.existsSync(generatedPath)) {
      fs.rmSync(generatedPath, { recursive: true, force: true });
    }

    // Clean up configuration file
    const configPath = path.resolve(process.cwd(), 'e2e', 'e2e.notion-typed.config.ts');
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }

    // Clean up any other test config files
    const possibleConfigs = [
      'test.notion-typed.config.ts',
      'test-direct.config.ts',
      'test.config.ts',
    ];
    
    for (const configName of possibleConfigs) {
      const filePath = path.resolve(process.cwd(), 'e2e', configName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
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