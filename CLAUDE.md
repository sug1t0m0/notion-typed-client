# CLAUDE.md - AI Development Assistant Guide

## 📋 Purpose of This File

This file is specifically designed for AI development assistants (particularly Claude Code) working on this repository. It contains:
- Internal architecture details and design decisions
- Development workflows and debugging procedures
- Implementation patterns and coding standards
- Technical constraints and workarounds

**For user-facing documentation, see [README.md](README.md)**

---

## 🤖 AI Assistant Instructions

When working on this repository, prioritize:
1. Maintaining type safety across all changes
2. Following existing naming conventions (PascalCase for classes, camelCase for functions)
3. Co-locating tests with implementation files
4. Using explicit exports over barrel exports for better tree-shaking


## 🔄 Workflows

### Task Initiation Workflow

1. **Branch Preparation**
   ```bash
   # Fetch latest main branch from remote
   git fetch origin
   git checkout main
   git pull origin main

   # Create feature branch following GitFlow
   git checkout -b feature/{IssueID}
   ```

2. **Context Understanding**
   - Review related files using Read/Grep/Glob tools
   - Understand existing design patterns
   - Check dependencies and their usage

3. **Planning**
   - Organize work items with TodoWrite tool
   - Identify impact scope of changes

4. **Environment Verification**
   - Confirm all tests pass
   - Verify build succeeds
   - Check development environment is functioning

### Task Completion Workflow

1. **Quality Checks**
   - Run `pnpm run lint --fix` to enforce linting
   - Run `pnpm run format` to enforce code formatting
   - Run `pnpm run ci` for comprehensive testing
   - If CI fails:
     - Analyze error and fix issues
     - Re-run quality checks (max 3 attempts)
     - Report and stop if still failing after 3 attempts
   - **Code Generation Validation** (if working on code generation features):
     - Clean up any existing generated directories: `rm -rf notion-typed-codegen`
     - Run code generation command: `node dist/cli.js generate`
     - Type check all TypeScript files in generated directory: `npx tsc notion-typed-codegen/*.ts --noEmit --skipLibCheck`
     - If type errors occur, fix the generator code and repeat validation

2. **Change Verification**
   - Check if `any` type was added to modified code
     - If added, confirm necessity with user
   - Verify adherence to existing design patterns
   - Remove debug logs (console.log, etc.) added during task
   - Remove unnecessary commented code

3. **Commit Preparation**
   - Commit changes in logical units
   - **Breaking Change Analysis**: Assess if API/type changes affect existing code
   - Use Conventional Commits format:
     - Example: `feat: add support for new property type`
     - Example: `fix: resolve path resolution issue`
     - Example: `feat!: change return type of getDatabase method`
     - Breaking change example:
       ```
       feat!: change constructor signature

       BREAKING CHANGE: Constructor now requires explicit client option
       instead of optional auth string
       ```

4. **Final Confirmation and Reporting**
   - Verify all tasks are completed
   - Present summary of changes
   - Clarify any remaining tasks

5. **Pull Request Creation**
   - Push to remote repository
   - Create pull request:
     - Title: Same as Issue title
     - Body: `Closes #[IssueID]` only

## Development Commands

Refer to `package.json` for available commands. Key commands:
- `pnpm run ci` - Run all quality checks
- `pnpm run lint --fix` - Auto-fix linting issues
- `pnpm run format` - Format code
- `pnpm test` - Run tests
- `pnpm run build` - Build the project

## Architecture

For detailed architecture documentation including:
- Core workflow and components
- Test architecture
- Build and packaging
- Configuration patterns
- Source code design principles
- Dependency injection architecture

See [docs/architecture.md](docs/architecture.md)
