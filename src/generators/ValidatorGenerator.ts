import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ResolvedDatabaseConfig } from '../types';
import { SchemaGenerator } from './SchemaGenerator';

export class ValidatorGenerator {
  private schemaGenerator: SchemaGenerator;

  constructor() {
    this.schemaGenerator = new SchemaGenerator();
  }

  generateValidators(databases: ResolvedDatabaseConfig[]): string {
    const schemas: Record<string, any> = {};

    for (const database of databases) {
      // メインスキーマ
      schemas[database.name] = this.schemaGenerator.generateJSONSchema(database);

      // 作成用スキーマ
      schemas[`Create${database.name}`] = this.schemaGenerator.generateCreateSchema(database);

      // 更新用スキーマ
      schemas[`Update${database.name}`] = this.schemaGenerator.generateUpdateSchema(database);
    }

    return this.generateValidatorCode(schemas, databases);
  }

  private generateValidatorCode(
    schemas: Record<string, any>,
    databases: ResolvedDatabaseConfig[]
  ): string {
    return `import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// JSON Schemas
const schemas = ${JSON.stringify(schemas, null, 2)};

// Initialize AJV
const ajv = new Ajv({ 
  allErrors: true,
  strict: false,
  validateFormats: true
});
addFormats(ajv);

// Compile validators
const mainValidators: Record<string, any> = {};
const createValidators: Record<string, any> = {};
const updateValidators: Record<string, any> = {};

${databases
  .map(
    (db) => `
mainValidators['${db.name}'] = ajv.compile(schemas['${db.name}']);
createValidators['${db.name}'] = ajv.compile(schemas['Create${db.name}']);
updateValidators['${db.name}'] = ajv.compile(schemas['Update${db.name}']);
`
  )
  .join('')}

export const validators = {
  main: mainValidators,
  create: createValidators,
  update: updateValidators,
  
  /**
   * Validate data against a database schema
   */
  validate(databaseName: string, data: any): boolean {
    const validator = mainValidators[databaseName];
    if (!validator) {
      throw new Error(\`No validator found for database: \${databaseName}\`);
    }
    return validator(data);
  },
  
  /**
   * Validate data for creating a new page
   */
  validateCreate(databaseName: string, data: any): boolean {
    const validator = createValidators[databaseName];
    if (!validator) {
      throw new Error(\`No create validator found for database: \${databaseName}\`);
    }
    return validator(data);
  },
  
  /**
   * Validate data for updating a page
   */
  validateUpdate(databaseName: string, data: any): boolean {
    const validator = updateValidators[databaseName];
    if (!validator) {
      throw new Error(\`No update validator found for database: \${databaseName}\`);
    }
    return validator(data);
  },
  
  /**
   * Get validation errors from the last validation
   */
  getErrors(databaseName: string, type: 'main' | 'create' | 'update' = 'main'): any[] | null {
    let validator;
    switch (type) {
      case 'create':
        validator = createValidators[databaseName];
        break;
      case 'update':
        validator = updateValidators[databaseName];
        break;
      default:
        validator = mainValidators[databaseName];
    }
    
    return validator?.errors || null;
  }
};`;
  }

  generateSchemaFile(databases: ResolvedDatabaseConfig[]): string {
    const schemas: Record<string, any> = {};

    for (const database of databases) {
      schemas[database.name] = this.schemaGenerator.generateJSONSchema(database);
      schemas[`Create${database.name}`] = this.schemaGenerator.generateCreateSchema(database);
      schemas[`Update${database.name}`] = this.schemaGenerator.generateUpdateSchema(database);
    }

    return JSON.stringify(schemas, null, 2);
  }
}
