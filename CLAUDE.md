# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **notion-typed-client**, a code generation tool that creates type-safe TypeScript clients for Notion APIs. The tool fetches database schemas from Notion, generates TypeScript types with strict type constraints for select/multi_select properties, and produces runtime validators using AJV.

## Development Commands

### Essential Commands
```bash
# Build the project
pnpm run build

# Run all tests  
pnpm test

# Run tests in watch mode with UI
pnpm run test:ui

# Run a specific test file
pnpm test src/generators/type-generator.test.ts

# Run tests with coverage
pnpm run test:coverage

# Lint the codebase
pnpm run lint

# Type checking without compilation
pnpm run typecheck

# Development build with watch
pnpm run dev
```

### CLI Testing Commands
```bash
# Test CLI with the example project
cd example
NOTION_API_KEY=$(cat .env | grep NOTION_API_KEY | cut -d'=' -f2) node ../dist/cli/cli.js build --config ./notion-typed.config.ts

# Test different implementation approaches
pnpm run test:notion  # Using @notionhq/client directly
pnpm run test:typed   # Using generated typed client
```

## Architecture Overview

### Core Workflow (3-Stage Process)
1. **Configuration Stage** (`src/types/config.ts`) - Accepts database configs with nullable IDs and property types
2. **Schema Fetching Stage** (`src/services/`) - Resolves IDs, fetches real schemas from Notion API, auto-detects types
3. **Code Generation Stage** (`src/generators/`) - Produces TypeScript types, validators, and typed clients

### Key Architectural Components

**Services Layer** (`src/services/`)
- `NotionFetcher` - Handles direct Notion API communication, ID resolution, and schema extraction
- `SchemaResolver` - Orchestrates the schema fetching and config updating workflow

**Generators Layer** (`src/generators/`)
- `TypeGenerator` - Uses json-schema-to-typescript to generate TypeScript interfaces
- `SchemaGenerator` - Creates JSON schemas from resolved database configs  
- `ValidatorGenerator` - Generates AJV runtime validators
- `ClientGenerator` - Produces the final typed Notion client with property conversion
- `Generator` - Main orchestrator that coordinates all generators

**Type System** (`src/types/`)
- Supports nullable IDs that get resolved via `notionName` searches
- Property types can be `null` for auto-detection from Notion
- Includes all Notion property types including `unique_id`

**CLI Layer** (`src/cli/`)
- Commands: `init`, `fetch`, `generate`, `build`, `validate`
- Each command is modular and can be composed

### Critical Type Generation Logic

The type generation handles a key challenge: mapping database names to types. Two mapping systems are used:
- `DatabaseIdMapping` - Maps actual database IDs to types  
- `DatabaseNameMapping` - Maps user-friendly database names to types
- `GetDatabaseTypeByName<T>` - The key helper type for client methods

### Example Directory Structure

The `/example` directory is a standalone project demonstrating:
- Comparison between raw `@notionhq/client` usage vs. generated typed client
- Independent pnpm project with its own dependencies
- Real API integration examples

## Test Architecture

**Location**: Tests are co-located with implementation files using `.test.ts` suffix
**Framework**: Vitest with global test functions
**Mock Data**: Shared test utilities in `src/test-utils.ts`
**Coverage**: Excludes CLI, config files, and type definitions

## Build and Packaging

**TypeScript Build**: Uses standard `tsc` compilation to `dist/`
**Package Publishing**: `prepublishOnly` ensures fresh build before npm publish
**CLI Binary**: Points to `dist/cli/cli.js` for command-line usage
**Git Ignore**: Build artifacts (`dist/`, `src/generated/`, `example/generated/`) are excluded from version control but included in npm package

## Configuration File Pattern

The tool expects a `notion-typed.config.ts` file exporting a `NotionTypedConfig`:
- Database configs start with nullable IDs and property types
- First run resolves IDs and types via Notion API calls
- Config file gets automatically updated with resolved values
- Subsequent runs use resolved IDs for performance

## Source Code Design Principles

### File Naming and Organization

**Entry Points** (snake_case):
- `src/index.ts` - Library entry point (package.json main field)
- `src/cli.ts` - CLI entry point (package.json bin field)
- Located at src root level for clear identification

**Implementation Files** (PascalCase):
- All other TypeScript files use PascalCase (e.g., `ConfigLoader.ts`, `NotionFetcher.ts`)
- Organized in subdirectories by functionality:
  - `src/cli/` - CLI commands and related functionality
  - `src/services/` - Core business logic services
  - `src/generators/` - Code generation modules
  - `src/types/` - Type definitions
  - `src/utils/` - Utility functions
  - `src/__tests__/` - Test utilities and mocks

**Test Files**:
- Co-located with implementation: `ComponentName.test.ts`
- Test utilities in `src/__tests__/` directory

### Entry Point Roles

- **`dist/cli.js`**: CLI executable with shebang, handles command-line interface
- **`dist/index.js`**: Library API exports for programmatic usage
- **`dist/cli/index.js`**: CLI module exports for internal CLI functionality

### Output Directory Design

**Default Output Path**: `./notion-typed-codegen`
- Clearly indicates auto-generated content
- Library-specific namespace prevents conflicts with other tools
- Located in user's project root (not in node_modules)

## Common Development Scenarios

**Adding New Property Types**: Extend `NotionPropertyType` in `src/types/config.ts` and add handling in generators
**Debugging Type Generation**: Check generated files in `notion-typed-codegen/` or run with example project
**Testing Real API Integration**: Use the example project with actual Notion database
**Schema Changes**: The tool auto-detects schema changes and prompts for config updates