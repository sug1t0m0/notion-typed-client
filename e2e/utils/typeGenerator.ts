/**
 * Shared utility for E2E type generation
 * Used by both test lifecycle and standalone type preparation
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { NotionTypedConfig } from '../../src/types';
import { E2E_CATEGORY_SCHEMA, E2E_TEST_SCHEMA } from '../fixtures/testSchemas';

// biome-ignore lint/complexity/noStaticOnlyClass: Utility functions grouped for organization
export class E2ETypeGenerator {
  /**
   * Create complete configuration with database IDs
   */
  static createConfig(testDatabaseId: string, categoryDatabaseId: string): NotionTypedConfig {
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
  static writeConfig(config: NotionTypedConfig): string {
    const configPath = path.resolve(process.cwd(), 'e2e', 'e2e.notion-typed.config.ts');
    const configContent = `import type { NotionTypedConfig } from '../src/types';

const config: NotionTypedConfig = ${JSON.stringify(config, null, 2)};

export default config;`;

    fs.writeFileSync(configPath, configContent);
    console.log('📝 Configuration written to:', configPath);
    return configPath;
  }

  /**
   * Build types and client from configuration
   */
  static buildTypesAndClient(configPath: string, apiKey: string, verbose = false): void {
    console.log('🔨 Building types and client...');

    try {
      const output = execSync(`echo "y" | npx ts-node src/cli.ts build --config ${configPath}`, {
        cwd: process.cwd(),
        encoding: 'utf-8' as BufferEncoding,
        env: { ...process.env, NOTION_API_KEY: apiKey },
        stdio: verbose ? 'inherit' : 'pipe',
      });

      if (!verbose && output) {
        console.log('✅ Types and client generated successfully');
      }
    } catch (error) {
      console.error('❌ Failed to generate types:', error);
      throw error;
    }
  }

  /**
   * Clean up generated files and configuration
   */
  static cleanupFiles(): void {
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
   * Generate types and client for E2E tests
   * Combines all steps into one convenient method
   */
  static async generateAll(
    testDatabaseId: string,
    categoryDatabaseId: string,
    apiKey: string,
    verbose = false
  ): Promise<string> {
    // Create configuration
    const config = E2ETypeGenerator.createConfig(testDatabaseId, categoryDatabaseId);

    // Write configuration file
    const configPath = E2ETypeGenerator.writeConfig(config);

    // Build types and client
    E2ETypeGenerator.buildTypesAndClient(configPath, apiKey, verbose);

    return configPath;
  }
}
