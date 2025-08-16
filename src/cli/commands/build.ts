import { Generator } from '../../generators';
import { SchemaResolver } from '../../services';
import { ConfigLoader, Logger } from '../../utils';

export class BuildCommand {
  private logger: Logger;

  constructor() {
    this.logger = Logger.create('Build');
  }

  async execute(options: { config?: string }): Promise<void> {
    try {
      // 設定を読み込む
      const configLoader = new ConfigLoader(options.config);
      const config = await configLoader.load();

      // スキーマを取得（設定ファイル更新あり）
      const resolver = new SchemaResolver(options.config);
      this.logger.info('Fetching schemas from Notion...');
      const fetchResult = await resolver.resolve({ dryRun: false });

      if (fetchResult.databases.length === 0) {
        this.logger.error('No databases found or accessible');
        process.exit(1);
      }

      this.logger.success(`Fetched ${fetchResult.databases.length} database(s)`);

      // 型とクライアントを生成
      this.logger.info('Generating types and client...');
      const generator = new Generator();
      await generator.generate(fetchResult, config);

      this.logger.success('Build completed successfully!');
      this.logger.info(`Output directory: ${config.output.path}`);

      // 使用方法のヒントを表示
      this.showUsageHint(config);
    } catch (error) {
      this.logger.error(`Build failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  private showUsageHint(config: any): void {
    const clientPath = `${config.output.path}/index`;
    const exampleDb = config.databases[0];

    if (!exampleDb) return;

    console.log('\n📝 Usage example:\n');
    console.log(`import { NotionTypedClient } from '${clientPath}';`);
    console.log(`import type { ${exampleDb.name} } from '${clientPath}';\n`);
    console.log('const client = new NotionTypedClient({');
    console.log('  auth: process.env.NOTION_API_KEY!');
    console.log('});\n');
    console.log(`// Create a new ${exampleDb.displayName}`);
    console.log(`const page = await client.createPage('${exampleDb.name}', {`);

    // プロパティの例を表示
    const sampleProps = exampleDb.properties.slice(0, 3);
    for (const prop of sampleProps) {
      if (prop.type === 'title') {
        console.log(`  ${prop.name}: 'Sample Title',`);
      } else if (prop.type === 'checkbox') {
        console.log(`  ${prop.name}: true,`);
      } else if (prop.type === 'number') {
        console.log(`  ${prop.name}: 42,`);
      } else if (prop.type === 'select' || prop.type === 'status') {
        console.log(`  ${prop.name}: 'option', // Type-safe options`);
      }
    }

    console.log('});\n');
  }
}
