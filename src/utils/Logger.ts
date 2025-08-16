import chalk from 'chalk';

export class Logger {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix;
  }

  info(message: string): void {
    console.log(chalk.blue('ℹ'), this.formatMessage(message));
  }

  success(message: string): void {
    console.log(chalk.green('✓'), this.formatMessage(message));
  }

  warning(message: string): void {
    console.log(chalk.yellow('⚠'), this.formatMessage(message));
  }

  error(message: string): void {
    console.error(chalk.red('✖'), this.formatMessage(message));
  }

  debug(message: string): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray('⚙'), this.formatMessage(message));
    }
  }

  table(data: unknown): void {
    console.table(data);
  }

  private formatMessage(message: string): string {
    return this.prefix ? `[${this.prefix}] ${message}` : message;
  }

  static create(prefix: string): Logger {
    return new Logger(prefix);
  }
}
