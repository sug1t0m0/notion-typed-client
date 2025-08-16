import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FetchResult, NotionTypedConfig } from '../types';
import { Logger } from '../utils';
import { ClientGenerator } from './ClientGenerator';
import { TypeGenerator } from './TypeGenerator';
import { ValidatorGenerator } from './ValidatorGenerator';

export class Generator {
  private logger: Logger;
  private typeGenerator: TypeGenerator;
  private clientGenerator: ClientGenerator;
  private validatorGenerator: ValidatorGenerator;

  constructor() {
    this.logger = Logger.create('Generator');
    this.typeGenerator = new TypeGenerator();
    this.clientGenerator = new ClientGenerator();
    this.validatorGenerator = new ValidatorGenerator();
  }

  async generate(fetchResult: FetchResult, config: NotionTypedConfig): Promise<void> {
    const outputPath = path.resolve(process.cwd(), config.output.path);

    // 出力ディレクトリを作成
    this.ensureDirectory(outputPath);

    // 型定義を生成
    this.logger.info('Generating type definitions...');
    const types = await this.typeGenerator.generateTypes(fetchResult.databases);
    this.writeFile(path.join(outputPath, 'types.ts'), types);

    // バリデータを生成
    this.logger.info('Generating validators...');
    const validators = this.validatorGenerator.generateValidators(fetchResult.databases);
    this.writeFile(path.join(outputPath, 'validators.ts'), validators);

    // JSON Schemaを生成
    this.logger.info('Generating JSON schemas...');
    const schemas = this.validatorGenerator.generateSchemaFile(fetchResult.databases);
    this.writeFile(path.join(outputPath, 'schemas.json'), schemas);

    // クライアントを生成
    this.logger.info('Generating client...');
    const clientName = config.output.clientName || 'client';
    const client = this.clientGenerator.generateClient(fetchResult.databases);
    this.writeFile(path.join(outputPath, `${clientName}.ts`), client);

    // インデックスファイルを生成
    this.logger.info('Generating index file...');
    const index = this.generateIndex(clientName);
    this.writeFile(path.join(outputPath, 'index.ts'), index);

    this.logger.success(`Generated files in ${outputPath}`);
  }

  private ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.logger.debug(`Created directory: ${dirPath}`);
    }
  }

  private writeFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, 'utf-8');
    this.logger.debug(`Written file: ${filePath}`);
  }

  private generateIndex(clientName: string): string {
    return `// Auto-generated Notion API client
// Generated at: ${new Date().toISOString()}

export * from './types';
export { NotionTypedClient } from './${clientName}';
export { validators } from './validators';

// Re-export schemas if needed
import schemas from './schemas.json';
export { schemas };
`;
  }
}
