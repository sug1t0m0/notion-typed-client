// Example using @notionhq/client
// Create a 1-hour meeting data using the standard Notion API client
require('dotenv').config();

import { Client } from '@notionhq/client';

async function testSimpleCreate() {
  const notion = new Client({
    auth: process.env.NOTION_API_KEY!,
  });

  console.log('Creating data with direct Notion API...\n');

  try {
    // Create properties directly in Notion API format
    const result = await notion.pages.create({
      parent: { database_id: '25dd880f2d0b806b9c73f12c66543414' },
      properties: {
        名前: {
          title: [
            {
              text: {
                content: '1時間会議（14:00-15:00） ' + new Date().toLocaleDateString('ja-JP'),
              },
            },
          ],
        },
        マルチセレクト: {
          multi_select: [{ name: 'あ' }, { name: 'う' }],
        },
        開始日時: {
          date: {
            start: '2025-08-15T14:00:00+09:00', // 2:00 PM start
            end: '2025-08-15T15:00:00+09:00', // 3:00 PM end (1 hour)
          },
        },
        終了日時: {
          date: {
            start: '2025-08-15T14:00:00+09:00', // 2:00 PM start
            end: '2025-08-15T15:00:00+09:00', // 3:00 PM end (1 hour)
          },
        },
      },
    });

    console.log('✅ Page created successfully!');
    console.log('  Page ID:', result.id);
    console.log(
      '  Created:',
      (result as any).created_time
        ? new Date((result as any).created_time).toLocaleString('ja-JP')
        : 'Unknown'
    );

    // Retrieve the created page
    console.log('\n🔍 Retrieving page...');
    const page = await notion.pages.retrieve({ page_id: result.id });

    if ('properties' in page) {
      console.log('📋 Page properties:');

      const titleProp = (page.properties as any)['名前'];
      console.log('  Name:', titleProp?.title?.[0]?.text?.content || 'N/A');

      const multiSelectProp = (page.properties as any)['マルチセレクト'];
      console.log(
        '  MultiSelect:',
        multiSelectProp?.multi_select?.map((item: any) => item.name) || 'N/A'
      );

      const startDateProp = (page.properties as any)['開始日時'];
      const startDate = startDateProp?.date;
      console.log(
        '  Start Date:',
        startDate ? `${startDate.start}${startDate.end ? ' ~ ' + startDate.end : ''}` : 'N/A'
      );

      const endDateProp = (page.properties as any)['終了日時'];
      const endDate = endDateProp?.date;
      console.log(
        '  End Date:',
        endDate ? `${endDate.start}${endDate.end ? ' ~ ' + endDate.end : ''}` : 'N/A'
      );

      const idProp = (page.properties as any)['ID'];
      console.log('  Unique ID:', idProp?.unique_id || 'N/A');
    }

    console.log('\n🎉 Test completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSimpleCreate();

/*
【Standard Notion API Client Features】
1. General-purpose and simple API
2. Supports any database structure
3. Access to all Notion features
4. Lightweight with fewer dependencies

📝 See test-with-typed-client.ts for additional features:
1. ID management through configuration files
2. TypeScript type safety
3. Auto-completion for property names
4. Type constraints for select options
5. Automatic schema synchronization
*/
