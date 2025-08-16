import { SchemaResolver } from '../../services';
import { Logger } from '../../utils';

export class FetchCommand {
  private logger: Logger;

  constructor() {
    this.logger = Logger.create('Fetch');
  }

  async execute(options: { config?: string; dryRun?: boolean }): Promise<void> {
    try {
      const resolver = new SchemaResolver(options.config);

      this.logger.info('Fetching schemas from Notion...');
      const result = await resolver.resolve({ dryRun: options.dryRun });

      if (result.databases.length === 0) {
        this.logger.warning('No databases found or accessible');
        return;
      }

      this.logger.success(`Fetched ${result.databases.length} database(s)`);

      // サマリーを表示
      for (const db of result.databases) {
        this.logger.info(`  - ${db.displayName} (${db.properties.length} properties)`);

        // select/multi_select/statusのオプションを表示
        for (const prop of db.properties) {
          if (prop.options && prop.options.length > 0) {
            const optionNames = prop.options.map((opt: any) => opt.name).join(', ');
            this.logger.debug(`    ${prop.displayName}: [${optionNames}]`);
          }
        }
      }

      if (options.dryRun) {
        this.logger.info('Dry run mode - no changes were made');
      } else if (result.configUpdates.length > 0) {
        this.logger.info('Configuration file has been updated');
      }
    } catch (error) {
      this.logger.error(`Fetch failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }
}
