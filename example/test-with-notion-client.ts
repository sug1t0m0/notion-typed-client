// @notionhq/client を使用したサンプル
// 標準のNotion APIクライアントで1時間会議データを作成
require('dotenv').config();

import { Client } from '@notionhq/client';

async function testSimpleCreate() {
  const notion = new Client({
    auth: process.env.NOTION_API_KEY!,
  });

  console.log('Creating data with direct Notion API...\n');

  try {
    // プロパティを直接Notion API形式で作成
    const result = await notion.pages.create({
      parent: { database_id: '22add72d0571805fbf1cd6ac883716c0' },
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
            start: '2025-08-15T14:00:00+09:00', // 2時開始
            end: '2025-08-15T15:00:00+09:00', // 3時終了（1時間）
          },
        },
        終了日時: {
          date: {
            start: '2025-08-15T14:00:00+09:00', // 2時開始
            end: '2025-08-15T15:00:00+09:00', // 3時終了（1時間）
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

    // 作成されたページを取得
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
【標準のNotion APIクライアントの特徴】
1. 汎用的でシンプルなAPI
2. 任意のデータベース構造に対応
3. Notionの全機能にアクセス可能
4. 軽量で依存関係が少ない

📝 参考: test-with-typed-client.ts では追加で以下を提供
1. 設定ファイルによるID管理
2. TypeScript型安全性
3. プロパティ名の自動補完
4. 選択肢の型制約
5. スキーマの自動同期
*/
