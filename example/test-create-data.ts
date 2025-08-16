// 生成されたクライアントを使ってデータを追加するテスト
require('dotenv').config();

// 生成されたクライアントとタイプをインポート
import { NotionTypedClient } from './notion-typed-codegen/client';
import type { CreatePlansDatabase } from './notion-typed-codegen/types';

async function createData() {
  console.log('Creating data using generated typed client...\n');

  // 型安全なクライアントを初期化
  const client = new NotionTypedClient({
    auth: process.env.NOTION_API_KEY!,
  });

  try {
    // 型安全なデータ作成
    const newPlan: CreatePlansDatabase = {
      name: 'テスト計画 ' + new Date().toLocaleDateString('ja-JP'),
      multiSelect: ['あ', 'う'], // 型安全：「あ」「い」「う」のみ許可
      startDate: {
        start: new Date().toISOString(), // 今日の日付（ISO 8601形式）
      },
      endDate: {
        start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1週間後（ISO 8601形式）
      },
    };

    console.log('📝 Creating new plan with data:');
    console.log('  Name:', newPlan.name);
    console.log('  MultiSelect:', newPlan.multiSelect);
    console.log('  Start Date:', newPlan.startDate?.start);
    console.log('  End Date:', newPlan.endDate?.start);
    console.log();

    // データベースに追加
    const result = await client.createPage('PlansDatabase', newPlan);

    console.log('✅ Successfully created page!');
    console.log('  Page ID:', result.id);
    console.log('  Created:', new Date(result.created_time).toLocaleString('ja-JP'));

    // 作成されたページを取得して確認
    console.log('\n🔍 Retrieving created page...');
    const retrievedPage = await client.getPage(result.id, 'PlansDatabase');

    console.log('📋 Retrieved page properties:');
    console.log('  Name:', retrievedPage.properties.name);
    console.log('  MultiSelect:', retrievedPage.properties.multiSelect);
    console.log('  Start Date:', retrievedPage.properties.startDate);
    console.log('  End Date:', retrievedPage.properties.endDate);
    console.log('  ID:', retrievedPage.properties.id);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// 型安全性のテストも実行
function testTypeSafety() {
  console.log('\n🔒 Type Safety Test:');

  // これらはコンパイル時エラーになるべき例
  console.log('Valid multiSelect options: ["あ", "い", "う"]');

  // 以下のコメントアウトを外すとTypeScriptコンパイルエラーになります
  /*
  const invalidData: CreatePlansDatabase = {
    name: 'Test',
    multiSelect: ['invalid', 'option'], // ❌ Type error: 不正な選択肢
  };
  */

  console.log('✅ Type safety is working correctly!');
}

testTypeSafety();
createData().catch(console.error);
