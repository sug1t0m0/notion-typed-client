#!/usr/bin/env node

/**
 * Prepare E2E types by creating actual test databases and generating real client code
 * This follows the same process as the actual E2E tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { DatabaseSetup } from '../setup/databaseSetup';
import { E2ETypeGenerator } from '../utils/typeGenerator';

// Check if generated files already exist
const generatedPath = path.resolve(process.cwd(), 'e2e', 'generated');
const requiredFiles = ['E2ETestClient.ts', 'types.ts', 'validators.ts', 'schemas.json'];

const filesExist =
  fs.existsSync(generatedPath) &&
  requiredFiles.every((file) => fs.existsSync(path.join(generatedPath, file)));

if (filesExist) {
  console.log('✅ Generated files already exist. Skipping generation.');
  console.log('   To force regeneration, delete e2e/generated/ directory first.');
  process.exit(0);
}

// Load E2E environment variables
// In CI environments, variables are set directly. In local development, load from .env.e2e
const envPath = path.resolve(process.cwd(), 'e2e', '.env.e2e');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // In CI, environment variables should be already set
  // Only warn if running locally (not in CI)
  if (!process.env.CI) {
    console.warn('⚠️  E2E environment file not found. Using environment variables directly.');
  }
}

const NOTION_API_KEY = process.env.NOTION_API_KEY_E2E || process.env.NOTION_API_KEY;
const NOTION_PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

if (!NOTION_API_KEY || !NOTION_PARENT_PAGE_ID) {
  console.error('❌ Required environment variables not set:');
  if (!NOTION_API_KEY) console.error('   - NOTION_API_KEY_E2E or NOTION_API_KEY');
  if (!NOTION_PARENT_PAGE_ID) console.error('   - NOTION_PARENT_PAGE_ID');
  console.error('');
  console.error('For local development:');
  console.error('  1. Copy e2e/.env.e2e.example to e2e/.env.e2e');
  console.error('  2. Add your Notion API credentials');
  console.error('');
  console.error('For CI environments:');
  console.error('  Ensure NOTION_API_KEY_E2E and NOTION_PARENT_PAGE_ID are set');
  process.exit(1);
}

async function prepareE2ETypes() {
  console.log('🚀 Preparing E2E types...');

  // 1. Initialize database setup
  // biome-ignore lint/style/noNonNullAssertion: Variable validated above
  const dbSetup = new DatabaseSetup(NOTION_API_KEY!);

  // 2. Create or find test databases
  console.log('📊 Setting up test databases...');

  // First, find or create category database
  let categoryDatabaseId = await dbSetup.findTestDatabase('E2E Categories');
  if (!categoryDatabaseId) {
    console.log('Creating new category database...');
    // biome-ignore lint/style/noNonNullAssertion: Variable validated above
    categoryDatabaseId = await dbSetup.createCategoryDatabase(NOTION_PARENT_PAGE_ID!);
  } else {
    console.log('Using existing category database:', categoryDatabaseId);
  }

  // Then, find or create test database
  let testDatabaseId = await dbSetup.findTestDatabase('E2E Test Database');
  if (!testDatabaseId) {
    console.log('Creating new test database...');
    // biome-ignore lint/style/noNonNullAssertion: Variable validated above
    testDatabaseId = await dbSetup.createTestDatabase(NOTION_PARENT_PAGE_ID!, categoryDatabaseId);
  } else {
    console.log('Using existing test database:', testDatabaseId);
  }

  // 3. Use shared type generator to create config and build types
  try {
    await E2ETypeGenerator.generateAll(
      testDatabaseId,
      categoryDatabaseId,
      // biome-ignore lint/style/noNonNullAssertion: Variable validated above
      NOTION_API_KEY!,
      false // Not verbose
    );
  } catch (error) {
    console.error('❌ Failed to generate types:', error);
    process.exit(1);
  }

  console.log('✨ E2E type preparation complete!');
  console.log('   Test Database ID:', testDatabaseId);
  console.log('   Category Database ID:', categoryDatabaseId);
  console.log('   Generated files in: e2e/generated/');
}

// Run the preparation
prepareE2ETypes().catch((error) => {
  console.error('❌ Error preparing E2E types:', error);
  process.exit(1);
});
