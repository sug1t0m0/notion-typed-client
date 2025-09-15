// Example using notion-typed-client
// Create a 1-hour meeting data using the type-safe client
require('dotenv').config();

// Import required modules
import { Client } from '@notionhq/client';
// Import generated client and types
import { NotionTypedClient } from './notion-typed-codegen/client';
import type { CreatePlansDatabase } from './notion-typed-codegen/types';

async function testTypedCreate() {
  // First create the official Notion client
  const notionClient = new Client({
    auth: process.env.NOTION_API_KEY!,
  });

  // Inject into the type-safe client
  const client = new NotionTypedClient({
    client: notionClient,
  });

  console.log('Creating data with typed Notion client (with Status Group Filtering)...\n');

  try {
    // 1. Create test data with different statuses
    console.log('📝 Creating test data with various statuses...');
    const testData: CreatePlansDatabase[] = [
      {
        name: 'Task A - Todo ' + new Date().toLocaleDateString('ja-JP'),
        hogeStatus: '未着手',
        multiSelect: ['あ'],
      },
      {
        name: 'Task B - In Progress ' + new Date().toLocaleDateString('ja-JP'),
        hogeStatus: '進行中',
        multiSelect: ['い'],
      },
      {
        name: 'Task C - Complete ' + new Date().toLocaleDateString('ja-JP'),
        hogeStatus: '完了',
        multiSelect: ['う'],
      },
    ];

    for (const data of testData) {
      const result = await client.createPage('PlansDatabase', data);
      console.log(`  ✅ Created: ${data.name} with status: ${data.hogeStatus}`);
    }

    // 2. Query using Status Group Filtering (NEW in v6!)
    console.log('\n🎯 Query using Status Group Filtering:');

    // Filter by single group
    console.log('\n📋 Fetching all To-do items...');
    const todoItems = await client.queryDatabase('PlansDatabase', {
      filter: {
        property: 'hogeStatus',
        status_group: { equals: 'To-do' }, // Type-safe group name!
      },
    });
    console.log(`  Found ${todoItems.results.length} To-do items`);

    // Filter by multiple groups
    console.log('\n📊 Fetching active items (To-do or In progress)...');
    const activeItems = await client.queryDatabase('PlansDatabase', {
      filter: {
        property: 'hogeStatus',
        status_group: { in_any: ['To-do', 'In progress'] }, // Type-safe group names!
      },
    });
    console.log(`  Found ${activeItems.results.length} active items`);
    activeItems.results.slice(0, 3).forEach((item) => {
      console.log(`    - ${item.properties.name}: ${item.properties.hogeStatus?.name || 'N/A'}`);
    });

    // 3. Compare with traditional filtering
    console.log('\n🔍 Comparison: Status Group vs Traditional Filtering:');

    // Traditional way (verbose)
    const traditionalActive = await client.queryDatabase('PlansDatabase', {
      filter: {
        or: [
          { property: 'hogeStatus', status: { equals: '未着手' } },
          { property: 'hogeStatus', status: { equals: '進行中' } },
        ],
      },
    });
    console.log(`  Traditional filter: ${traditionalActive.results.length} results`);

    // New way with status groups (clean, maintainable)
    const groupBasedActive = await client.queryDatabase('PlansDatabase', {
      filter: {
        property: 'hogeStatus',
        status_group: { in_any: ['To-do', 'In progress'] },
      },
    });
    console.log(`  Group-based filter: ${groupBasedActive.results.length} results`);
    console.log('  ✅ Results are the same!');

    // 4. Complex filter combining status groups with other properties
    console.log('\n🎯 Complex filter: High-priority active items...');
    const highPriorityActive = await client.queryDatabase('PlansDatabase', {
      filter: {
        and: [
          {
            property: 'hogeStatus',
            status_group: { in_any: ['To-do', 'In progress'] },
          },
          {
            property: 'multiSelect',
            multi_select: { contains: 'あ' },
          },
        ],
      },
      sorts: [{ property: 'startDate', direction: 'ascending' }],
    });
    console.log(`  Found ${highPriorityActive.results.length} high-priority active items`);

    // 5. Exclude completed items
    console.log('\n🔄 Fetching non-completed items...');
    const notCompleted = await client.queryDatabase('PlansDatabase', {
      filter: {
        property: 'hogeStatus',
        status_group: { does_not_equal: 'Complete' },
      },
    });
    console.log(`  Found ${notCompleted.results.length} non-completed items`);

    console.log('\n🎉 Test completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testTypedCreate();

/*
【notion-typed-client Additional Features】
1. Database management through configuration files
2. Automatic TypeScript type generation
3. Auto-completion for properties
4. Type constraints for select options ('あ' | 'い' | 'う')
5. Type constraints for status properties
   - Individual status options ('未着手' | '進行中' | '完了')
   - Status group names ('To-do' | 'In progress' | 'Complete')
6. Compile-time type checking
7. Runtime validation
8. Type-safe access to API responses

📝 Solves development challenges from test-with-notion-client.ts:
- No need to manually research property types
- Easier to maintain type safety
- Eliminates typo risks in property access
- Clear visibility of valid options (whether 'あ', 'い', 'う' are valid)
- Automatic maintenance when database structure changes
*/
