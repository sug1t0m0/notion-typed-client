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

  console.log('Creating data with typed Notion client...\n');

  try {
    // Create type-safe data
    const newPlan: CreatePlansDatabase = {
      name: '1時間会議（14:00-15:00） ' + new Date().toLocaleDateString('ja-JP'),
      multiSelect: ['あ', 'う'], // Type-safe: options are restricted
      startDate: {
        start: '2025-08-16T14:00:00+09:00', // 2:00 PM start
      },
      endDate: {
        start: '2025-08-16T15:00:00+09:00', // 3:00 PM end (1 hour)
      },
    };

    console.log('📝 Creating new plan with data:');
    console.log('  Name:', newPlan.name);
    console.log('  MultiSelect:', newPlan.multiSelect);
    console.log('  Start Date:', newPlan.startDate?.start);
    console.log('  End Date:', newPlan.endDate?.start);
    console.log();

    // Add to database (type-checked)
    const result = await client.createPage('PlansDatabase', newPlan);

    console.log('✅ Successfully created page!');
    console.log('  Page ID:', result.id);
    console.log('  Created:', new Date(result.created_time).toLocaleString('ja-JP'));

    // Retrieve and verify the created page (type-safe)
    console.log('\n🔍 Retrieving created page...');
    const retrievedPage = await client.getPage(result.id, 'PlansDatabase');

    console.log('📋 Retrieved page properties:');
    console.log('  Name:', retrievedPage.properties.name); // Type-safe access
    console.log(
      '  MultiSelect:',
      retrievedPage.properties.multiSelect?.map((option) => option.name)
    );
    console.log(
      '  Start Date:',
      retrievedPage.properties.startDate
        ? `${retrievedPage.properties.startDate.start}${retrievedPage.properties.startDate.end ? ' ~ ' + retrievedPage.properties.startDate.end : ''}`
        : 'N/A'
    );
    console.log(
      '  End Date:',
      retrievedPage.properties.endDate
        ? `${retrievedPage.properties.endDate.start}${retrievedPage.properties.endDate.end ? ' ~ ' + retrievedPage.properties.endDate.end : ''}`
        : 'N/A'
    );
    console.log('  Unique ID:', retrievedPage.properties.id || 'N/A');

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
5. Compile-time type checking
6. Runtime validation
7. Type-safe access to API responses

📝 Solves development challenges from test-with-notion-client.ts:
- No need to manually research property types
- Easier to maintain type safety
- Eliminates typo risks in property access
- Clear visibility of valid options (whether 'あ', 'い', 'う' are valid)
- Automatic maintenance when database structure changes
*/
