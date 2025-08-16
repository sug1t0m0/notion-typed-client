# Notion Typed Client Example

このディレクトリは、`notion-typed-client`の完全な使用例を示す独立したプロジェクトです。

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env`ファイルを作成して、Notion APIキーを設定してください：

```bash
cp .env.example .env
# .envファイルを編集してNOTION_API_KEYを設定
```

### 3. Notionデータベースの準備

1. [Notion Integration](https://www.notion.so/my-integrations)を作成
2. データベースを作成し、Integrationに共有
3. データベースIDを`notion-typed.config.ts`に設定

## 使い方

### 1. スキーマの取得と型定義の生成

Notionからスキーマを取得して、TypeScript型定義とクライアントを生成：

```bash
# スキーマ取得と型生成を一度に実行
pnpm build

# または個別に実行
pnpm fetch   # スキーマを取得して設定を更新
pnpm generate # 型定義とクライアントを生成
```

これにより`./generated`ディレクトリに以下のファイルが生成されます：
- `types.ts` - TypeScript型定義
- `client.ts` - 型安全なNotionクライアント
- `validators.ts` - ランタイムバリデーター
- `schemas.json` - JSON Schema定義

### 2. 型安全なクライアントの使用

生成されたクライアントを使ってNotionデータベースを操作：

```typescript
import { NotionTypedClient } from './generated/client';
import type { CreatePlansDatabase } from './generated/types';

const client = new NotionTypedClient({
  auth: process.env.NOTION_API_KEY!
});

// 型安全なデータ作成
const newPlan: CreatePlansDatabase = {
  name: 'プロジェクト計画',
  multiSelect: ['あ', 'い'], // 型チェックされる
  startDate: {
    start: new Date().toISOString()
  }
};

await client.createPage('PlansDatabase', newPlan);
```

## ファイル説明

### 設定ファイル
- `notion-typed.config.ts` - データベースの設定
- `.env` - 環境変数（Notion APIキー）
- `tsconfig.json` - TypeScript設定
- `package.json` - プロジェクト設定

### サンプルコード
- `test-with-notion-client.ts` - @notionhq/client を使用した例
- `test-with-typed-client.ts` - notion-typed-client を使用した例  
- `test-create-data.ts` - 型安全クライアントの基本的な使用例

### 生成されるファイル（generated/）
- `types.ts` - データベースの型定義
- `client.ts` - 型安全なクライアント
- `validators.ts` - バリデーター
- `schemas.json` - JSON Schema
- `index.ts` - エクスポート用インデックス

## スクリプト

```json
{
  "generate": "型定義とクライアントを生成",
  "fetch": "Notionからスキーマを取得",
  "build": "fetchとgenerateを順番に実行",
  "test:notion": "@notionhq/client を使ったテストを実行",
  "test:typed": "notion-typed-client を使ったテストを実行",
  "test:create": "型安全クライアントの基本テストを実行"
}
```

## 実装方法の比較

### @notionhq/client を使用
```bash
pnpm run test:notion
```
- 汎用的でシンプルなAPI
- 任意のデータベース構造に対応
- Notionの全機能にアクセス可能
- 軽量で依存関係が少ない

### notion-typed-client を使用  
```bash
pnpm run test:typed
```
- 設定ファイルでデータベース管理
- TypeScript型安全性
- プロパティの自動補完
- 選択肢の型制約
- ランタイムバリデーション

## 注意事項

- このexampleは実際のNotionデータベースに接続します
- テストを実行すると実際にデータが作成されます
- 本番環境では適切なエラーハンドリングを実装してください