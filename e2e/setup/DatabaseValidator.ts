import { Client } from '@notionhq/client';
import type { GetDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';
import type { DatabaseConfig, PropertyConfig } from '../../src/types';
import { Logger } from '../../src/utils/Logger';

const logger = new Logger('E2E:DatabaseValidator');

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingProperties: PropertyConfig[];
  incorrectTypes: Array<{
    property: PropertyConfig;
    actualType: string;
    expectedType: string;
  }>;
}

export class DatabaseValidator {
  private client: Client;

  constructor(apiKey: string) {
    this.client = new Client({ auth: apiKey });
  }

  /**
   * Validate that a database has all required properties with correct types
   */
  async validateDatabase(
    databaseId: string,
    expectedSchema: DatabaseConfig
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingProperties: PropertyConfig[] = [];
    const incorrectTypes: Array<{
      property: PropertyConfig;
      actualType: string;
      expectedType: string;
    }> = [];

    try {
      // Fetch database schema from Notion
      const database = await this.client.databases.retrieve({ database_id: databaseId });
      const notionProperties = (database as GetDatabaseResponse).properties;

      // Check each expected property
      for (const expectedProp of expectedSchema.properties) {
        const notionProp = notionProperties[expectedProp.notionName];

        if (!notionProp) {
          // Property is missing
          missingProperties.push(expectedProp);

          // Determine if this is an error or warning based on property type
          const isCritical = this.isCriticalProperty(expectedProp.type);
          const message = `Missing property: "${expectedProp.notionName}" (${expectedProp.type})`;

          if (isCritical) {
            errors.push(`❌ ${message}`);
          } else {
            warnings.push(`⚠️  ${message}`);
          }
        } else {
          // Property exists, check type
          const actualType = notionProp.type;
          const expectedType = expectedProp.type;

          // Special handling for relations which might have different type strings
          if (expectedType === 'relation' && actualType === 'relation') {
            // Relation type matches
            continue;
          }

          if (actualType !== expectedType && expectedType !== null) {
            incorrectTypes.push({
              property: expectedProp,
              actualType,
              expectedType: expectedType || 'unknown',
            });

            errors.push(
              `❌ Property "${expectedProp.notionName}" has wrong type: ${actualType} (expected: ${expectedType})`
            );
          }

          // Validate options for select/multi_select/status properties
          if (
            expectedProp.type === 'select' ||
            expectedProp.type === 'multi_select' ||
            expectedProp.type === 'status'
          ) {
            this.validatePropertyOptions(expectedProp, notionProp, warnings);
          }
        }
      }

      // Check for extra properties (informational only)
      const expectedPropertyNames = new Set(expectedSchema.properties.map((p) => p.notionName));

      for (const notionPropName of Object.keys(notionProperties)) {
        if (!expectedPropertyNames.has(notionPropName)) {
          logger.info(`Additional property found: "${notionPropName}" (not in expected schema)`);
        }
      }

      const isValid = errors.length === 0;

      if (!isValid) {
        logger.error(`Database validation failed with ${errors.length} error(s)`);
      } else if (warnings.length > 0) {
        logger.warning(`Database validation passed with ${warnings.length} warning(s)`);
      } else {
        logger.info('Database validation passed successfully');
      }

      return {
        isValid,
        errors,
        warnings,
        missingProperties,
        incorrectTypes,
      };
    } catch (error) {
      const errorMessage = `Failed to validate database: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(errorMessage);

      return {
        isValid: false,
        errors: [errorMessage],
        warnings: [],
        missingProperties: [],
        incorrectTypes: [],
      };
    }
  }

  /**
   * Validate that two databases exist and have required properties
   */
  async validateDatabases(
    testDatabaseId: string,
    categoryDatabaseId: string,
    testSchema: DatabaseConfig,
    categorySchema: DatabaseConfig
  ): Promise<{ testValidation: ValidationResult; categoryValidation: ValidationResult }> {
    logger.info('Starting database validation...');

    const testValidation = await this.validateDatabase(testDatabaseId, testSchema);
    const categoryValidation = await this.validateDatabase(categoryDatabaseId, categorySchema);

    // Log summary
    const allValid = testValidation.isValid && categoryValidation.isValid;
    const totalErrors = testValidation.errors.length + categoryValidation.errors.length;
    const totalWarnings = testValidation.warnings.length + categoryValidation.warnings.length;

    if (allValid) {
      logger.info(`✅ All databases validated successfully (${totalWarnings} warnings)`);
    } else {
      logger.error(
        `❌ Database validation failed: ${totalErrors} errors, ${totalWarnings} warnings`
      );
    }

    return { testValidation, categoryValidation };
  }

  /**
   * Generate a detailed error message for validation failures
   */
  formatValidationError(validation: ValidationResult, databaseName: string): string {
    const lines: string[] = [`\n❌ Database validation failed for "${databaseName}":\n`];

    if (validation.errors.length > 0) {
      lines.push('Errors:');
      for (const error of validation.errors) {
        lines.push(`  ${error}`);
      }
      lines.push('');
    }

    if (validation.warnings.length > 0) {
      lines.push('Warnings:');
      for (const warning of validation.warnings) {
        lines.push(`  ${warning}`);
      }
      lines.push('');
    }

    if (validation.missingProperties.length > 0) {
      lines.push('Missing properties:');
      validation.missingProperties.forEach((prop) => {
        lines.push(`  - ${prop.notionName} (${prop.type})`);
      });
      lines.push('');
    }

    if (validation.incorrectTypes.length > 0) {
      lines.push('Incorrect property types:');
      validation.incorrectTypes.forEach((item) => {
        lines.push(`  - ${item.property.notionName}: ${item.actualType} → ${item.expectedType}`);
      });
      lines.push('');
    }

    lines.push('Please ensure the database has all required properties.');
    lines.push('See e2e/DATABASE_TEMPLATE.md for the exact schema required.\n');

    return lines.join('\n');
  }

  /**
   * Check if a property type is critical (must exist)
   */
  private isCriticalProperty(type: string | null): boolean {
    const criticalTypes = ['title', 'status'];
    return type !== null && criticalTypes.includes(type);
  }

  /**
   * Validate options for select/multi_select/status properties
   */
  private validatePropertyOptions(
    expectedProp: PropertyConfig,
    // biome-ignore lint/suspicious/noExplicitAny: Notion API types are complex
    notionProp: any,
    warnings: string[]
  ): void {
    // This could be extended to validate specific option values if needed
    const hasOptions =
      notionProp.select?.options || notionProp.multi_select?.options || notionProp.status?.options;

    if (!hasOptions) {
      warnings.push(`⚠️  Property "${expectedProp.notionName}" has no options configured`);
    }
  }
}
