#!/usr/bin/env node

// Load environment variables from .env file before anything else
import * as dotenv from 'dotenv';

dotenv.config();

import { Command } from 'commander';
import {
  BuildCommand,
  FetchCommand,
  GenerateCommand,
  InitCommand,
  ValidateCommand,
} from './cli/commands';

const program = new Command();

program
  .name('notion-typed-client')
  .description('Type-safe Notion API client generator')
  .version('1.0.0');

// Init command
program
  .command('init')
  .description('Initialize configuration files')
  .option('--config <path>', 'Config file path', './notion-typed.config.ts')
  .option('--force', 'Overwrite existing files')
  .action(async (options) => {
    const command = new InitCommand();
    await command.execute(options);
  });

// Fetch command
program
  .command('fetch')
  .description('Fetch schemas from Notion and update configuration')
  .option('--config <path>', 'Config file path', './notion-typed.config.ts')
  .option('--dry-run', 'Show what would be updated without making changes')
  .action(async (options) => {
    const command = new FetchCommand();
    await command.execute(options);
  });

// Generate command
program
  .command('generate')
  .description('Generate types and client from configuration')
  .option('--config <path>', 'Config file path', './notion-typed.config.ts')
  .option('--watch', 'Watch for changes and regenerate automatically')
  .action(async (options) => {
    const command = new GenerateCommand();
    await command.execute(options);
  });

// Build command
program
  .command('build')
  .description('Fetch schemas and generate types/client (fetch + generate)')
  .option('--config <path>', 'Config file path', './notion-typed.config.ts')
  .action(async (options) => {
    const command = new BuildCommand();
    await command.execute(options);
  });

// Validate command
program
  .command('validate')
  .description('Validate configuration against Notion schemas')
  .option('--config <path>', 'Config file path', './notion-typed.config.ts')
  .action(async (options) => {
    const command = new ValidateCommand();
    await command.execute(options);
  });

// Handle errors
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);
