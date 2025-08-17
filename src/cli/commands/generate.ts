import { Generator } from '../../generators';
import { SchemaResolver } from '../../services';
import { ConfigLoader, Logger } from '../../utils';

export class GenerateCommand {
  private logger: Logger;

  constructor() {
    this.logger = Logger.create('Generate');
  }

  async execute(options: { config?: string; watch?: boolean }): Promise<void> {
    try {
      if (options.watch) {
        await this.watch(options.config);
      } else {
        await this.generate(options.config);
      }
    } catch (error) {
      this.logger.error(
        `Generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  }

  private async generate(configPath?: string): Promise<void> {
    // 設定を読み込む
    const configLoader = new ConfigLoader(configPath);
    const config = await configLoader.load();

    // スキーマを取得（更新なし）
    const resolver = new SchemaResolver({ configPath });
    this.logger.info('Loading schemas...');
    const fetchResult = await resolver.resolve({ dryRun: true });

    if (fetchResult.databases.length === 0) {
      this.logger.error('No databases found. Run "fetch" command first.');
      process.exit(1);
    }

    // 生成
    const generator = new Generator();
    await generator.generate(fetchResult, config);

    this.logger.success('Generation completed successfully!');
    this.logger.info(`Output directory: ${config.output.path}`);
  }

  private async watch(configPath?: string): Promise<void> {
    const fs = await import('node:fs');
    const _path = await import('node:path');

    const configLoader = new ConfigLoader(configPath);
    const resolvedConfigPath = configLoader.getConfigPath();

    this.logger.info(`Watching for changes: ${resolvedConfigPath}`);

    // 初回実行
    await this.generate(configPath);

    // ファイル監視
    let isGenerating = false;
    fs.watchFile(resolvedConfigPath, async () => {
      if (isGenerating) return;

      isGenerating = true;
      this.logger.info('Config file changed, regenerating...');

      try {
        await this.generate(configPath);
      } catch (error) {
        this.logger.error(`Generation failed: ${error}`);
      }

      isGenerating = false;
    });

    // プロセス終了時にクリーンアップ
    process.on('SIGINT', () => {
      fs.unwatchFile(resolvedConfigPath);
      this.logger.info('Stopped watching');
      process.exit(0);
    });
  }
}
