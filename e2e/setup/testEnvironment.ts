import * as path from 'node:path';
import { config } from 'dotenv';
import { Logger } from '../../src/utils/Logger';

const logger = new Logger('E2E:TestEnvironment');

/**
 * Setup test environment
 * This file is loaded before all E2E tests
 */

// Load environment variables from .env.e2e
const envPath = path.resolve(process.cwd(), 'e2e', '.env.e2e');
const result = config({ path: envPath });

if (result.error) {
  console.log('.env.e2e file not found. Using environment variables.');
}

// Validate required environment variables
const requiredEnvVars = ['NOTION_API_KEY_E2E', 'NOTION_PARENT_PAGE_ID'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Set default values for optional variables
process.env.E2E_TEST_TIMEOUT = process.env.E2E_TEST_TIMEOUT || '300000';
process.env.E2E_RATE_LIMIT_DELAY = process.env.E2E_RATE_LIMIT_DELAY || '350';
process.env.E2E_CLEANUP_ON_SUCCESS = process.env.E2E_CLEANUP_ON_SUCCESS || 'true';
process.env.E2E_VERBOSE_LOGGING = process.env.E2E_VERBOSE_LOGGING || 'false';

// Export configuration for tests
export const E2E_CONFIG = {
  // biome-ignore lint/style/noNonNullAssertion: Variables validated above
  apiKey: process.env.NOTION_API_KEY_E2E!,
  // biome-ignore lint/style/noNonNullAssertion: Variables validated above
  parentPageId: process.env.NOTION_PARENT_PAGE_ID!,
  workspaceId: 'auto', // Always use workspace from API key
  databaseId: null, // Always auto-create
  timeout: Number.parseInt(process.env.E2E_TEST_TIMEOUT, 10),
  rateLimitDelay: Number.parseInt(process.env.E2E_RATE_LIMIT_DELAY, 10),
  cleanupOnSuccess: process.env.E2E_CLEANUP_ON_SUCCESS === 'true',
  verboseLogging: process.env.E2E_VERBOSE_LOGGING === 'true',
};

logger.info('E2E test environment initialized');
