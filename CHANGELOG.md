# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-16

### Added
- Initial release of notion-typed-client
- Type-safe wrapper for Notion SDK with database schema injection
- CLI tool for configuration and code generation
- Support for TypeScript type generation from Notion database schemas
- Runtime validation with AJV and JSON Schema
- Comprehensive testing suite with Vitest
- GitHub Actions CI/CD pipeline
- Biome linting and formatting
- Node.js 20+ support with modern ESM ecosystem compatibility

### Features
- **Configuration System**: TypeScript-based configuration files with automatic updates
- **Schema Management**: Notion API integration for database schema fetching and validation
- **Code Generation**: TypeScript type generation and client wrapper generation with type safety
- **CLI Interface**: Complete CLI with init, fetch, generate, build, and validate commands
- **Testing**: Comprehensive test coverage with co-located test files
- **Developer Experience**: Modern tooling with Biome, Vitest, and TypeScript strict mode