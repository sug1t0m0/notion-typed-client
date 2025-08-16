import { ResolvedDatabaseConfig, ResolvedPropertyConfig } from '../types';

export class SchemaGenerator {
  generateJSONSchema(database: ResolvedDatabaseConfig): any {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const prop of database.properties) {
      const schema = this.generatePropertySchema(prop);
      if (schema) {
        properties[prop.name] = schema;

        // titleとstatusは必須
        if (prop.type === 'title' || prop.type === 'status') {
          required.push(prop.name);
        }
      }
    }

    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      title: database.name,
      properties,
      required,
      additionalProperties: false,
    };
  }

  generateCreateSchema(database: ResolvedDatabaseConfig): any {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const prop of database.properties) {
      const schema = this.generateCreatePropertySchema(prop);
      if (schema) {
        properties[prop.name] = schema;

        // 作成時は title のみ必須
        if (prop.type === 'title') {
          required.push(prop.name);
        }
      }
    }

    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      title: `Create${database.name}`,
      properties,
      required,
      additionalProperties: false,
    };
  }

  generateUpdateSchema(database: ResolvedDatabaseConfig): any {
    const properties: Record<string, any> = {};

    for (const prop of database.properties) {
      const schema = this.generateCreatePropertySchema(prop);
      if (schema) {
        properties[prop.name] = schema;
      }
    }

    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      title: `Update${database.name}`,
      properties,
      required: [], // 更新時は全て任意
      additionalProperties: false,
    };
  }

  private generatePropertySchema(prop: ResolvedPropertyConfig): any {
    switch (prop.type) {
      case 'title':
      case 'rich_text':
        return { type: 'string' };

      case 'number':
        return {
          oneOf: [{ type: 'number' }, { type: 'null' }],
        };

      case 'select':
        if (prop.options && prop.options.length > 0) {
          return {
            oneOf: [
              {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    enum: prop.options.map((opt: any) => opt.name),
                  },
                  color: { type: 'string' },
                },
                required: ['name'],
              },
              { type: 'null' },
            ],
          };
        }
        return {
          oneOf: [
            {
              type: 'object',
              properties: {
                name: { type: 'string' },
                color: { type: 'string' },
              },
              required: ['name'],
            },
            { type: 'null' },
          ],
        };

      case 'multi_select':
        if (prop.options && prop.options.length > 0) {
          return {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  enum: prop.options.map((opt: any) => opt.name),
                },
                color: { type: 'string' },
              },
              required: ['name'],
            },
          };
        }
        return {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              color: { type: 'string' },
            },
            required: ['name'],
          },
        };

      case 'status':
        if (prop.options && prop.options.length > 0) {
          return {
            oneOf: [
              {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    enum: prop.options.map((opt: any) => opt.name),
                  },
                  color: { type: 'string' },
                },
                required: ['name'],
              },
              { type: 'null' },
            ],
          };
        }
        return {
          oneOf: [
            {
              type: 'object',
              properties: {
                name: { type: 'string' },
                color: { type: 'string' },
              },
              required: ['name'],
            },
            { type: 'null' },
          ],
        };

      case 'date':
        return {
          oneOf: [
            {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date-time' },
                end: {
                  oneOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
                },
              },
              required: ['start'],
            },
            { type: 'null' },
          ],
        };

      case 'people':
        return {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
            required: ['id'],
          },
        };

      case 'files':
        return {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              url: { type: 'string', format: 'uri' },
            },
            required: ['name', 'url'],
          },
        };

      case 'checkbox':
        return { type: 'boolean' };

      case 'url':
      case 'email':
      case 'phone_number':
        return {
          oneOf: [{ type: 'string' }, { type: 'null' }],
        };

      case 'created_time':
      case 'last_edited_time':
        return { type: 'string', format: 'date-time' };

      case 'created_by':
      case 'last_edited_by':
        return {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        };

      case 'relation':
        return {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
            required: ['id'],
          },
        };

      case 'unique_id':
        return {
          oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'null' }],
        };

      case 'formula':
      case 'rollup':
      default:
        return { type: 'any' };
    }
  }

  private generateCreatePropertySchema(prop: ResolvedPropertyConfig): any {
    switch (prop.type) {
      case 'title':
      case 'rich_text':
        return { type: 'string' };

      case 'number':
        return { type: 'number' };

      case 'select':
      case 'status':
        if (prop.options && prop.options.length > 0) {
          return {
            type: 'string',
            enum: prop.options.map((opt: any) => opt.name),
          };
        }
        return { type: 'string' };

      case 'multi_select':
        if (prop.options && prop.options.length > 0) {
          return {
            type: 'array',
            items: {
              type: 'string',
              enum: prop.options.map((opt: any) => opt.name),
            },
          };
        }
        return {
          type: 'array',
          items: { type: 'string' },
        };

      case 'date':
        return {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' },
          },
          required: ['start'],
        };

      case 'people':
      case 'relation':
        return {
          type: 'array',
          items: { type: 'string' },
        };

      case 'files':
        return {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              url: { type: 'string', format: 'uri' },
            },
            required: ['name', 'url'],
          },
        };

      case 'checkbox':
        return { type: 'boolean' };

      case 'url':
      case 'email':
      case 'phone_number':
        return { type: 'string' };

      // 読み取り専用プロパティは作成/更新スキーマには含まない
      case 'unique_id':
      case 'created_time':
      case 'created_by':
      case 'last_edited_time':
      case 'last_edited_by':
      case 'formula':
      case 'rollup':
        return null;

      default:
        return { type: 'any' };
    }
  }
}
