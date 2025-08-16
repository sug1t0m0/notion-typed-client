// notion-typed-client を使用したサンプル
// 型安全なクライアントで1時間会議データを作成
require('dotenv').config();

// 生成されたクライアントとタイプをインポート
import { NotionTypedClient } from './notion-typed-codegen/client';
import type { CreatePlansDatabase } from './notion-typed-codegen/types';

async function testTypedCreate() {
  const client = new NotionTypedClient({
    auth: process.env.NOTION_API_KEY!,
  });

  console.log('Creating data with typed Notion client...\n');

  try {
    // 型安全なデータ作成（test-before-raw-api.ts と同じ内容）
    const newPlan: CreatePlansDatabase = {
      name: '1時間会議（14:00-15:00） ' + new Date().toLocaleDateString('ja-JP'),
      multiSelect: ['あ', 'う'], // 型安全：選択肢が制限される
      startDate: {
        start: '2025-08-16T14:00:00+09:00', // 14:00開始
      },
      endDate: {
        start: '2025-08-16T15:00:00+09:00', // 15:00終了（1時間）
      },
    };

    console.log('📝 Creating new plan with data:');
    console.log('  Name:', newPlan.name);
    console.log('  MultiSelect:', newPlan.multiSelect);
    console.log('  Start Date:', newPlan.startDate?.start);
    console.log('  End Date:', newPlan.endDate?.start);
    console.log();

    // データベースに追加（型チェック済み）
    const result = await client.createPage('PlansDatabase', newPlan);

    console.log('✅ Successfully created page!');
    console.log('  Page ID:', result.id);
    console.log('  Created:', new Date(result.created_time).toLocaleString('ja-JP'));

    // 作成されたページを取得して確認（型安全）
    console.log('\n🔍 Retrieving created page...');
    const retrievedPage = await client.getPage(result.id, 'PlansDatabase');

    console.log('📋 Retrieved page properties:');
    console.log('  Name:', retrievedPage.properties.name); // 型安全なアクセス
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
【notion-typed-client の追加機能】
1. 設定ファイルでデータベース管理
2. TypeScript型定義の自動生成
3. プロパティの自動補完
4. 選択肢の型制約（'あ' | 'い' | 'う'）
5. コンパイル時の型チェック
6. ランタイムバリデーション
7. APIレスポンスの型安全なアクセス

📝 参考: test-with-notion-client.ts の開発課題を解決
- 各プロパティの型を手動で調べる必要がある
- 型の安全性を保つのが難しい
- プロパティアクセスでtypoのリスク
- 選択肢が不明（「あ」「い」「う」が有効かわからない）
- データベース構造変更時の手動メンテナンス
*/
