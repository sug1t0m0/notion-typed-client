# notion-typed-client

[![npm version](https://img.shields.io/npm/v/@sug1t0m0/notion-typed-client.svg)](https://www.npmjs.com/package/@sug1t0m0/notion-typed-client)
[![npm downloads](https://img.shields.io/npm/dm/@sug1t0m0/notion-typed-client.svg)](https://www.npmjs.com/package/@sug1t0m0/notion-typed-client)
[![Test and Lint](https://github.com/sug1t0m0/notion-typed-client/workflows/Test%20and%20Lint/badge.svg)](https://github.com/sug1t0m0/notion-typed-client/actions/workflows/test-and-lint.yml)
[![Auto Release](https://github.com/sug1t0m0/notion-typed-client/workflows/Auto%20Release/badge.svg)](https://github.com/sug1t0m0/notion-typed-client/actions/workflows/auto-release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

Type-safe code generation tool for Notion API clients

## Overview

notion-typed-client solves the type-safety issues of generic Notion API clients. It fetches database schemas from Notion and automatically generates TypeScript type definitions and type-safe API clients with validation capabilities.

### Key Features

- 🔒 **Complete Type Safety** - Represents actual options for select/multi_select/status properties as types
- 🔄 **Automatic Schema Sync** - Fetches latest schema information from Notion API and generates types
- ✅ **Runtime Validation** - Runtime value validation with AJV
- 🎯 **Workflow-Specific** - Generates clients optimized for specific database structures
- 🔧 **Auto-Configuration Updates** - Automatic ID resolution and notionName change detection
- 🔌 **Dependency Injection** - Inject custom Notion client implementations for testing and customization

## Installation

```bash
npm install -D @sug1t0m0/notion-typed-client
# or
pnpm add -D @sug1t0m0/notion-typed-client
# or
yarn add -D @sug1t0m0/notion-typed-client
```

## Quick Start

### 1. Initial Setup

```bash
npx notion-typed-client init
```

Set your Notion API key in `.env` file:

```env
NOTION_API_KEY=your_notion_api_key_here
```

### 2. Create Configuration File

`notion-typed.config.ts`:

```typescript
import { NotionTypedConfig } from 'notion-typed-client';

const config: NotionTypedConfig = {
  databases: [
    {
      id: null,  // OK to be null initially, will be auto-resolved later
      name: 'TaskDatabase',
      displayName: 'Task Database',
      notionName: 'Tasks',
      properties: [
        {
          id: null,
          name: 'title',
          displayName: 'Title',
          notionName: 'Title',
          type: 'title'
        },
        {
          id: null,
          name: 'status',
          displayName: 'Status',
          notionName: 'Status',
          type: 'status'
          // options will be fetched automatically
        },
        {
          id: null,
          name: 'priority',
          displayName: 'Priority',
          notionName: 'Priority',
          type: 'select'
          // options will be fetched automatically
        },
        {
          id: null,
          name: 'tags',
          displayName: 'Tags',
          notionName: 'Tags',
          type: 'multi_select'
          // options will be fetched automatically
        },
        {
          id: null,
          name: 'customField',
          displayName: 'Custom Field',
          notionName: 'Custom Field',
          type: null  // type will also be auto-detected from Notion
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

### 3. Fetch Schema and Generate Client

```bash
# Fetch schema, resolve IDs, and generate types in one command
npx notion-typed-client build

# Or run individually
npx notion-typed-client fetch    # Fetch schema and resolve IDs
npx notion-typed-client generate  # Generate types and client
```

### 4. Use the Generated Client

#### Basic Usage

```typescript
import { NotionTypedClient } from './generated/client';
import { TaskDatabase } from './generated/types';
import { Client } from '@notionhq/client';

// Create official Notion client
const notionClient = new Client({
  auth: process.env.NOTION_API_KEY!
});

// Use with generated typed client
const client = new NotionTypedClient({
  client: notionClient
});

// Type-safe page creation
const newTask = await client.createPage('TaskDatabase', {
  title: 'New Task',           // string type
  status: 'In Progress',        // Only 'Not Started' | 'In Progress' | 'Done' allowed
  priority: 'High',             // Only 'Low' | 'Medium' | 'High' allowed
  tags: ['urgent', 'review']    // Only defined options allowed
});

// Type-safe query with filter support
const tasks = await client.queryDatabase('TaskDatabase', {
  filter: {
    property: 'status',
    status: {
      equals: 'In Progress'  // Type-safe: only valid status options allowed
    }
  }
});

// Compound filters (and/or) are also type-safe
const filteredTasks = await client.queryDatabase('TaskDatabase', {
  filter: {
    and: [
      { property: 'status', status: { equals: 'In Progress' } },
      { property: 'priority', select: { equals: 'High' } }
    ]
  }
});

// Page update with validation
const updated = await client.updatePage('page-id', 'TaskDatabase', {
  status: 'Done'  // Also validated at runtime
});
```

#### Dependency Injection (Advanced)

You can inject your own Notion client implementation for testing or customization:

```typescript
import { NotionTypedClient } from './generated/client';
import type { NotionClientInterface } from '@sug1t0m0/notion-typed-client';

// Mock client for testing
const mockClient: NotionClientInterface = {
  databases: {
    retrieve: jest.fn(),
    query: jest.fn(),
  },
  pages: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
  },
  search: jest.fn(),
};

// Use injected client
const client = new NotionTypedClient({
  client: mockClient
});

// Your custom client with logging, retry logic, etc.
class CustomNotionClient implements NotionClientInterface {
  private baseClient: Client;
  
  constructor(options: { auth: string }) {
    this.baseClient = new Client(options);
  }
  
  databases = {
    retrieve: async (args) => {
      console.log('Retrieving database:', args.database_id);
      return this.baseClient.databases.retrieve(args);
    },
    query: async (args) => {
      console.log('Querying database:', args.database_id);
      return this.baseClient.databases.query(args);
    },
  };
  
  pages = {
    create: async (args) => {
      console.log('Creating page');
      return this.baseClient.pages.create(args);
    },
    retrieve: async (args) => {
      console.log('Retrieving page:', args.page_id);
      return this.baseClient.pages.retrieve(args);
    },
    update: async (args) => {
      console.log('Updating page:', args.page_id);
      return this.baseClient.pages.update(args);
    },
  };
  
  search = async (args) => {
    console.log('Searching:', args.query);
    return this.baseClient.search(args);
  };
}

const customClient = new CustomNotionClient({
  auth: process.env.NOTION_API_KEY!
});

const client = new NotionTypedClient({
  client: customClient
});
```

## CLI Commands

### `init`
Creates configuration file template and necessary files.

```bash
npx notion-typed-client init [options]

Options:
  --config <path>  Configuration file path (default: "./notion-typed.config.ts")
  --force         Overwrite existing files
```

### `fetch`
Fetches schema information from Notion API, resolves IDs, and updates configuration file.

```bash
npx notion-typed-client fetch [options]

Options:
  --config <path>  Configuration file path
  --dry-run       Preview changes without applying them
```

### `generate`
Generates type definitions and client code from fetched schema.

```bash
npx notion-typed-client generate [options]

Options:
  --config <path>  Configuration file path
  --watch         Watch for file changes and auto-generate
```

### `build`
Runs `fetch` and `generate` sequentially.

```bash
npx notion-typed-client build [options]
```

### `validate`
Validates consistency between configuration and actual Notion schema.

```bash
npx notion-typed-client validate [options]
```

## Configuration File Details

### DatabaseConfig

| Property | Type | Description |
|-----------|-----|------|
| `id` | `string \| null` | Database ID (searches by notionName if null) |
| `name` | `string` | Type name in TypeScript |
| `displayName` | `string` | Display name for logs |
| `notionName` | `string` | Actual name in Notion |
| `properties` | `PropertyConfig[]` | Array of property configurations |

### PropertyConfig

| Property | Type | Description |
|-----------|-----|------|
| `id` | `string \| null` | Property ID (searches by notionName if null) |
| `name` | `string` | Property name in TypeScript |
| `displayName` | `string` | Display name for logs |
| `notionName` | `string` | Actual property name in Notion |
| `type` | `NotionPropertyType \| null` | Property type (auto-detected from Notion if null) |

### Supported Property Types

- `title` - Title
- `rich_text` - Rich Text
- `number` - Number
- `select` - Single Select (options auto-fetched)
- `multi_select` - Multi Select (options auto-fetched)
- `status` - Status (options auto-fetched)
- `date` - Date
- `people` - People
- `files` - Files
- `checkbox` - Checkbox
- `url` - URL
- `email` - Email
- `phone_number` - Phone Number
- `formula` - Formula
- `relation` - Relation
- `rollup` - Rollup
- `created_time` - Created Time
- `created_by` - Created By
- `last_edited_time` - Last Edited Time
- `last_edited_by` - Last Edited By

## Auto-Update Features

### ID Resolution
On first run, entries with `id: null` are automatically resolved using `notionName` and the configuration file is updated.

### Name Change Detection
When IDs already exist, detects name changes in Notion and prompts to update `notionName` in the configuration file.

### Auto-Fetching Options
Options for select/multi_select/status properties are automatically fetched from Notion API and reflected in type definitions. No manual management needed.

## Generated Files

By default, the following files are generated in the `./notion-typed-codegen/` directory:

- `types.ts` - TypeScript type definitions
- `client.ts` - Type-safe Notion client
- `validators.ts` - Runtime validators
- `schemas.json` - JSON Schema definitions

## Frequently Asked Questions (FAQ)

### Q: Why do I need this tool?
**A:** The official Notion SDK is generic and doesn't provide database-specific type information. This tool generates type-safe clients based on your database structure, significantly improving the development experience.

### Q: What happens when options are changed?
**A:** Running `npx notion-typed-client build` fetches the latest schema and updates type definitions. Added, removed, or changed options are automatically reflected.

### Q: Can I manage multiple databases?
**A:** Yes, you can add multiple database configurations to the `databases` array in `notion-typed.config.ts`.

### Q: Can I customize the generated code?
**A:** Generated code is overwritten, so don't edit it directly. If customization is needed, create your own class that wraps the generated client.

## Best Practices

### 1. Environment Variable Management
```bash
# .env.local (development)
NOTION_API_KEY=secret_development_key

# .env.production (production)
NOTION_API_KEY=secret_production_key
```

### 2. CI/CD Usage
```yaml
# GitHub Actions example
- name: Generate Notion types
  env:
    NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
  run: |
    npx notion-typed-client build
    npx tsc --noEmit
```

### 3. Type Reuse
```typescript
// Use generated types in other files
import type { PlansDatabase } from './notion-typed-codegen/types';

function processPlans(plans: PlansDatabase[]): void {
  // Type-safe processing
}
```

## Troubleshooting

### Invalid API Key
Verify that the correct Notion API key is set in your `.env` file.

### Database Not Found
- Check that your Notion API key has access permissions to the database
- Verify that `notionName` matches exactly (case-sensitive)

### Type Errors
Run `npx notion-typed-client build` to regenerate types with the latest schema.

## Release Management

This project follows [Semantic Versioning](https://semver.org/).

### Automatic Releases

- **feat:** prefix commits trigger minor version bumps
- **fix:** prefix commits trigger patch version bumps
- **BREAKING CHANGE:** or commits with `!` trigger major version bumps

### Manual Releases

Run the "Release" workflow from the GitHub Actions tab to select version type.

### Version Management
- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (1.x.0): New features (backward compatible)
- **PATCH** (1.1.x): Bug fixes

### Conventional Commits

Commit messages should follow this format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Examples:
```
feat(cli): add new init command
fix: resolve type generation bug
docs: update README with examples
BREAKING CHANGE: remove deprecated API
```

To use the configured commit message template:
```bash
git config commit.template .gitmessage
```

## License

MIT

## Contributing

Issues and Pull Requests are welcome!

## Links

- [GitHub Repository](https://github.com/sug1t0m0/notion-typed-client)
- [NPM Package](https://www.npmjs.com/package/@sug1t0m0/notion-typed-client)
- [Notion API Documentation](https://developers.notion.com/)