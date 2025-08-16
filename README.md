# notion-typed-client

Notion APIクライアントに型安全性をもたらす自動生成ツール

## 概要

notion-typed-clientは、Notion APIの汎用的なクライアントの型安全性の問題を解決します。データベースのスキーマ情報を取得し、TypeScriptの型定義とバリデーション機能を持つ専用APIクライアントを自動生成します。

### 主な特徴

- 🔒 **完全な型安全性** - select/multi_select/statusプロパティの実際の選択肢を型として表現
- 🔄 **自動スキーマ同期** - Notion APIから最新のスキーマ情報を取得して型を生成
- ✅ **ランタイムバリデーション** - AJVによる実行時の値検証
- 🎯 **ワークフロー特化** - 特定のデータベース構造に最適化されたクライアント生成
- 🔧 **設定の自動更新** - IDの自動解決とnotionName変更の検出

## インストール

```bash
npm install -D notion-typed-client
# または
pnpm add -D notion-typed-client
# または
yarn add -D notion-typed-client
```

## クイックスタート

### 1. 初期設定

```bash
npx notion-typed-client init
```

`.env`ファイルにNotion APIキーを設定:

```env
NOTION_API_KEY=your_notion_api_key_here
```

### 2. 設定ファイルの作成

`notion-typed.config.ts`:

```typescript
import { NotionTypedConfig } from 'notion-typed-client';

const config: NotionTypedConfig = {
  databases: [
    {
      id: null,  // 初回はnullでOK、後で自動解決されます
      name: 'TaskDatabase',
      displayName: 'タスクデータベース',
      notionName: 'Tasks',
      properties: [
        {
          id: null,
          name: 'title',
          displayName: 'タイトル',
          notionName: 'Title',
          type: 'title'
        },
        {
          id: null,
          name: 'status',
          displayName: 'ステータス',
          notionName: 'Status',
          type: 'status'
          // optionsは自動取得されます
        },
        {
          id: null,
          name: 'priority',
          displayName: '優先度',
          notionName: 'Priority',
          type: 'select'
          // optionsは自動取得されます
        },
        {
          id: null,
          name: 'tags',
          displayName: 'タグ',
          notionName: 'Tags',
          type: 'multi_select'
          // optionsは自動取得されます
        },
        {
          id: null,
          name: 'customField',
          displayName: 'カスタムフィールド',
          notionName: 'Custom Field',
          type: null  // typeもNotionから自動検出されます
        }
      ]
    }
  ],
  output: {
    path: './src/generated',
    clientName: 'NotionClient'
  }
};

export default config;
```

### 3. スキーマ取得とクライアント生成

```bash
# スキーマ取得・ID解決・型生成を一括実行
npx notion-typed-client build

# または個別実行
npx notion-typed-client fetch    # スキーマ取得・ID解決
npx notion-typed-client generate  # 型・クライアント生成
```

### 4. 生成されたクライアントの使用

```typescript
import { NotionClient } from './generated/notion-client';
import { TaskDatabase } from './generated/types';

const client = new NotionClient({
  auth: process.env.NOTION_API_KEY
});

// 型安全なページ作成
const newTask = await client.pages.create<TaskDatabase>({
  parent: { database_id: 'your-database-id' },
  properties: {
    title: 'New Task',           // string型
    status: 'In Progress',        // 'Not Started' | 'In Progress' | 'Done' のみ許可
    priority: 'High',             // 'Low' | 'Medium' | 'High' のみ許可
    tags: ['urgent', 'review']    // 定義された選択肢のみ許可
  }
});

// 型安全なクエリ
const tasks = await client.databases.query<TaskDatabase>({
  database_id: 'your-database-id',
  filter: {
    property: 'status',
    status: {
      equals: 'In Progress'  // 型チェックで無効な値を防ぐ
    }
  }
});

// バリデーション付きページ更新
const updated = await client.pages.update<TaskDatabase>({
  page_id: 'page-id',
  properties: {
    status: 'Done'  // ランタイムでも検証される
  }
});
```

## CLI コマンド

### `init`
設定ファイルのテンプレートと必要なファイルを生成します。

```bash
npx notion-typed-client init [options]

Options:
  --config <path>  設定ファイルのパス (default: "./notion-typed.config.ts")
  --force         既存ファイルを上書き
```

### `fetch`
Notion APIからスキーマ情報を取得し、IDの解決と設定ファイルの更新を行います。

```bash
npx notion-typed-client fetch [options]

Options:
  --config <path>  設定ファイルのパス
  --dry-run       変更を適用せずに確認のみ
```

### `generate`
取得したスキーマから型定義とクライアントコードを生成します。

```bash
npx notion-typed-client generate [options]

Options:
  --config <path>  設定ファイルのパス
  --watch         ファイル変更を監視して自動生成
```

### `build`
`fetch`と`generate`を順次実行します。

```bash
npx notion-typed-client build [options]
```

### `validate`
設定とNotionの実際のスキーマとの整合性を検証します。

```bash
npx notion-typed-client validate [options]
```

## 設定ファイル詳細

### DatabaseConfig

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `id` | `string \| null` | データベースID（nullの場合notionNameで検索） |
| `name` | `string` | TypeScriptでの型名 |
| `displayName` | `string` | 日本語表示名 |
| `notionName` | `string` | Notion上の実際の名前 |
| `properties` | `PropertyConfig[]` | プロパティ設定の配列 |

### PropertyConfig

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| `id` | `string \| null` | プロパティID（nullの場合notionNameで検索） |
| `name` | `string` | TypeScriptでのプロパティ名 |
| `displayName` | `string` | 日本語表示名 |
| `notionName` | `string` | Notion上の実際のプロパティ名 |
| `type` | `NotionPropertyType \| null` | プロパティタイプ（nullの場合Notionから自動検出） |

### サポートされるプロパティタイプ

- `title` - タイトル
- `rich_text` - リッチテキスト
- `number` - 数値
- `select` - 単一選択（選択肢は自動取得）
- `multi_select` - 複数選択（選択肢は自動取得）
- `status` - ステータス（選択肢は自動取得）
- `date` - 日付
- `people` - ユーザー
- `files` - ファイル
- `checkbox` - チェックボックス
- `url` - URL
- `email` - メールアドレス
- `phone_number` - 電話番号
- `formula` - 数式
- `relation` - リレーション
- `rollup` - ロールアップ
- `created_time` - 作成日時
- `created_by` - 作成者
- `last_edited_time` - 最終更新日時
- `last_edited_by` - 最終更新者

## 自動更新機能

### ID解決
初回実行時、`id: null`のエントリーは`notionName`を使って自動的にIDが解決され、設定ファイルが更新されます。

### 名前変更検出
既存のIDがある場合、Notion上での名前変更を検出し、設定ファイルの`notionName`を更新するか確認します。

### 選択肢の自動取得
select/multi_select/statusプロパティの選択肢は、Notion APIから自動的に取得され、型定義に反映されます。手動での管理は不要です。

## 生成されるファイル

```
src/generated/
├── types.ts           # 型定義
├── schemas.json       # JSON Schema
├── validators.ts      # AJVバリデータ
├── client.ts         # 型安全なAPIクライアント
└── index.ts          # エクスポート用エントリーポイント
```

## 設計原則

1. **Notionが単一情報源** - 選択肢などの動的情報は全てNotion APIから取得
2. **柔軟なID管理** - 初期設定時は名前で検索、運用時はIDで固定
3. **型安全性** - コンパイル時とランタイム両方でのバリデーション
4. **保守性** - 設定ファイルの自動同期により手動メンテナンス不要

## トラブルシューティング

### APIキーが無効
`.env`ファイルに正しいNotion APIキーが設定されているか確認してください。

### データベースが見つからない
- Notion APIキーがデータベースへのアクセス権限を持っているか確認
- `notionName`が正確に一致しているか確認（大文字小文字も区別されます）

### 型エラー
`npx notion-typed-client build`を実行して最新のスキーマで型を再生成してください。

## リリース管理

このプロジェクトは[Semantic Versioning](https://semver.org/)に従っています。

### 自動リリース

- **feat:** プレフィックスのコミットでminorバージョンが上がります
- **fix:** プレフィックスのコミットでpatchバージョンが上がります  
- **BREAKING CHANGE:** または `!` を含むコミットでmajorバージョンが上がります

### 手動リリース

GitHubの Actions タブから "Release" ワークフローを実行してバージョンタイプを選択できます。

### バージョン管理
- **MAJOR** (x.0.0): 破壊的変更
- **MINOR** (1.x.0): 新機能追加（後方互換性あり）
- **PATCH** (1.1.x): バグ修正

### Conventional Commits

コミットメッセージは以下の形式に従ってください：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

例:
```
feat(cli): add new init command
fix: resolve type generation bug
docs: update README with examples
BREAKING CHANGE: remove deprecated API
```

設定されたコミットメッセージテンプレートを使用する場合：
```bash
git config commit.template .gitmessage
```

## ライセンス

MIT

## Contributing

Issues and Pull Requests are welcome!

## Links

- [GitHub Repository](https://github.com/yourusername/notion-typed-client)
- [Notion API Documentation](https://developers.notion.com/)