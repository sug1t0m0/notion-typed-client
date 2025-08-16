import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../../utils';

export class InitCommand {
  private logger: Logger;

  constructor() {
    this.logger = Logger.create('Init');
  }

  async execute(options: { config?: string; force?: boolean }): Promise<void> {
    const configPath = options.config || path.resolve(process.cwd(), 'notion-typed.config.ts');

    // 既存ファイルのチェック
    if (fs.existsSync(configPath) && !options.force) {
      this.logger.error(`Config file already exists: ${configPath}`);
      this.logger.info('Use --force to overwrite');
      process.exit(1);
    }

    // 設定ファイルテンプレートを作成
    this.createConfigFile(configPath);

    // .envファイルのテンプレートを作成
    this.createEnvFile();

    // .gitignoreに追加
    this.updateGitignore();

    this.logger.success('Initialization completed!');
    this.logger.info('Next steps:');
    this.logger.info('1. Add your Notion API key to .env file');
    this.logger.info('2. Edit notion-typed.config.ts with your database configuration');
    this.logger.info('3. Run "npx notion-typed-client fetch" to fetch schemas');
    this.logger.info('4. Run "npx notion-typed-client generate" to generate types and client');
  }

  private createConfigFile(configPath: string): void {
    const template = `import { NotionTypedConfig } from 'notion-typed-client';

const config: NotionTypedConfig = {
  databases: [
    {
      id: null, // Will be resolved automatically
      name: 'TaskDatabase', // TypeScript type name
      displayName: 'タスクデータベース', // Display name for logs
      notionName: 'Tasks', // Actual database name in Notion
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
          // Options will be fetched automatically
        },
        {
          id: null,
          name: 'priority',
          displayName: '優先度',
          notionName: 'Priority',
          type: 'select'
          // Options will be fetched automatically
        },
        {
          id: null,
          name: 'assignee',
          displayName: '担当者',
          notionName: 'Assignee',
          type: 'people'
        },
        {
          id: null,
          name: 'dueDate',
          displayName: '期限',
          notionName: 'Due Date',
          type: 'date'
        },
        {
          id: null,
          name: 'tags',
          displayName: 'タグ',
          notionName: 'Tags',
          type: 'multi_select'
          // Options will be fetched automatically
        },
        {
          id: null,
          name: 'completed',
          displayName: '完了',
          notionName: 'Completed',
          type: 'checkbox'
        },
        {
          id: null,
          name: 'description',
          displayName: '説明',
          notionName: 'Description',
          type: 'rich_text'
        }
      ]
    }
    // Add more databases here
  ],
  output: {
    path: './notion-typed-codegen',
    clientName: 'client'
  }
};

export default config;
`;

    fs.writeFileSync(configPath, template, 'utf-8');
    this.logger.success(`Created config file: ${configPath}`);
  }

  private createEnvFile(): void {
    const envPath = path.resolve(process.cwd(), '.env');
    const envExamplePath = path.resolve(process.cwd(), '.env.example');

    const template = `# Notion API Key
# Get your API key from https://www.notion.so/my-integrations
NOTION_API_KEY=your_notion_api_key_here
`;

    // .env.exampleは常に作成/更新
    fs.writeFileSync(envExamplePath, template, 'utf-8');
    this.logger.success('Created .env.example');

    // .envは存在しない場合のみ作成
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, template, 'utf-8');
      this.logger.success('Created .env file');
    } else {
      this.logger.info('.env file already exists, skipping');
    }
  }

  private updateGitignore(): void {
    const gitignorePath = path.resolve(process.cwd(), '.gitignore');
    const additions = ['', '# Notion Typed Client', '.env', 'src/generated/', '*.log'];

    if (fs.existsSync(gitignorePath)) {
      const current = fs.readFileSync(gitignorePath, 'utf-8');

      // 既に追加されているかチェック
      if (current.includes('# Notion Typed Client')) {
        this.logger.info('.gitignore already configured');
        return;
      }

      // 追加
      const updated = current + '\n' + additions.join('\n') + '\n';
      fs.writeFileSync(gitignorePath, updated, 'utf-8');
      this.logger.success('Updated .gitignore');
    } else {
      // 新規作成
      const content = additions.slice(1).join('\n') + '\n';
      fs.writeFileSync(gitignorePath, content, 'utf-8');
      this.logger.success('Created .gitignore');
    }
  }
}
