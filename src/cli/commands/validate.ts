import { SchemaResolver } from '../../services';
import { Logger } from '../../utils';

export class ValidateCommand {
  private logger: Logger;

  constructor() {
    this.logger = Logger.create('Validate');
  }

  async execute(options: { config?: string }): Promise<void> {
    try {
      const resolver = new SchemaResolver({ configPath: options.config });

      this.logger.info('Validating configuration against Notion...');
      const isValid = await resolver.validateConfig();

      if (isValid) {
        this.logger.success('Configuration is valid and in sync with Notion');
        process.exit(0);
      } else {
        this.logger.error('Configuration has issues. Run "fetch" command to fix them.');
        process.exit(1);
      }
    } catch (error) {
      this.logger.error(
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  }
}
