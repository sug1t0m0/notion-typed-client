/**
 * Vitest global setup file
 * This runs once before all test suites
 */

import { TestLifecycle } from './testLifecycle';

export async function setup() {
  console.log('\n====================================');
  console.log('  E2E Test Suite - Global Setup');
  console.log('====================================\n');

  const lifecycle = TestLifecycle.getInstance();
  await lifecycle.globalSetup();
}

export async function teardown() {
  console.log('\n====================================');
  console.log('  E2E Test Suite - Global Teardown');
  console.log('====================================\n');

  const lifecycle = TestLifecycle.getInstance();
  await lifecycle.globalTeardown();
}
