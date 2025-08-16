import * as fs from 'fs';
import * as ts from 'typescript';
import { DatabaseConfig, PropertyConfig } from '../types';

export class ConfigUpdater {
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  async updateDatabase(
    databaseName: string,
    updates: {
      id?: string;
      notionName?: string;
      properties?: Array<{
        name: string;
        id?: string;
        notionName?: string;
        type?: string;
      }>;
    }
  ): Promise<void> {
    const sourceFile = this.readSourceFile();
    const transformer = this.createTransformer(databaseName, updates);

    const result = ts.transform(sourceFile, [transformer]);
    const transformedSourceFile = result.transformed[0];

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const updatedCode = printer.printFile(transformedSourceFile);

    fs.writeFileSync(this.configPath, updatedCode, 'utf-8');
  }

  private readSourceFile(): ts.SourceFile {
    const sourceCode = fs.readFileSync(this.configPath, 'utf-8');
    return ts.createSourceFile(this.configPath, sourceCode, ts.ScriptTarget.Latest, true);
  }

  private createTransformer(
    databaseName: string,
    updates: any
  ): ts.TransformerFactory<ts.SourceFile> {
    return (context: ts.TransformationContext) => {
      const visit: ts.Visitor = (node: ts.Node): ts.Node => {
        // databases配列を探す
        if (ts.isArrayLiteralExpression(node)) {
          const elements = node.elements.map((element) => {
            if (ts.isObjectLiteralExpression(element)) {
              const nameProperty = this.findProperty(element, 'name');
              if (nameProperty && this.getStringValue(nameProperty) === databaseName) {
                return this.updateDatabaseObject(element, updates);
              }
            }
            return element;
          });

          return ts.factory.updateArrayLiteralExpression(node, elements);
        }

        return ts.visitEachChild(node, visit, context);
      };

      return (sourceFile: ts.SourceFile) => ts.visitNode(sourceFile, visit) as ts.SourceFile;
    };
  }

  private updateDatabaseObject(
    dbObject: ts.ObjectLiteralExpression,
    updates: any
  ): ts.ObjectLiteralExpression {
    const properties = dbObject.properties.map((prop) => {
      if (ts.isPropertyAssignment(prop)) {
        const propName = this.getPropertyName(prop);

        // IDの更新
        if (propName === 'id' && updates.id !== undefined) {
          return ts.factory.updatePropertyAssignment(
            prop,
            prop.name,
            ts.factory.createStringLiteral(updates.id)
          );
        }

        // notionNameの更新
        if (propName === 'notionName' && updates.notionName !== undefined) {
          return ts.factory.updatePropertyAssignment(
            prop,
            prop.name,
            ts.factory.createStringLiteral(updates.notionName)
          );
        }

        // propertiesの更新
        if (
          propName === 'properties' &&
          updates.properties &&
          ts.isArrayLiteralExpression(prop.initializer)
        ) {
          const updatedProperties = this.updatePropertiesArray(
            prop.initializer,
            updates.properties
          );
          return ts.factory.updatePropertyAssignment(prop, prop.name, updatedProperties);
        }
      }
      return prop;
    });

    return ts.factory.updateObjectLiteralExpression(dbObject, properties);
  }

  private updatePropertiesArray(
    propsArray: ts.ArrayLiteralExpression,
    propertyUpdates: Array<{ name: string; id?: string; notionName?: string; type?: string }>
  ): ts.ArrayLiteralExpression {
    const elements = propsArray.elements.map((element) => {
      if (ts.isObjectLiteralExpression(element)) {
        const nameProperty = this.findProperty(element, 'name');
        const propName = nameProperty ? this.getStringValue(nameProperty) : null;

        if (propName) {
          const update = propertyUpdates.find((u) => u.name === propName);
          if (update) {
            return this.updatePropertyObject(element, update);
          }
        }
      }
      return element;
    });

    return ts.factory.updateArrayLiteralExpression(propsArray, elements);
  }

  private updatePropertyObject(
    propObject: ts.ObjectLiteralExpression,
    update: { name: string; id?: string; notionName?: string; type?: string }
  ): ts.ObjectLiteralExpression {
    const properties = propObject.properties.map((prop) => {
      if (ts.isPropertyAssignment(prop)) {
        const propName = this.getPropertyName(prop);

        if (propName === 'id' && update.id !== undefined) {
          return ts.factory.updatePropertyAssignment(
            prop,
            prop.name,
            ts.factory.createStringLiteral(update.id)
          );
        }

        if (propName === 'notionName' && update.notionName !== undefined) {
          return ts.factory.updatePropertyAssignment(
            prop,
            prop.name,
            ts.factory.createStringLiteral(update.notionName)
          );
        }

        if (propName === 'type' && update.type !== undefined) {
          return ts.factory.updatePropertyAssignment(
            prop,
            prop.name,
            ts.factory.createStringLiteral(update.type)
          );
        }
      }
      return prop;
    });

    return ts.factory.updateObjectLiteralExpression(propObject, properties);
  }

  private findProperty(
    obj: ts.ObjectLiteralExpression,
    propertyName: string
  ): ts.PropertyAssignment | undefined {
    return obj.properties.find((prop) => {
      if (ts.isPropertyAssignment(prop)) {
        return this.getPropertyName(prop) === propertyName;
      }
      return false;
    }) as ts.PropertyAssignment | undefined;
  }

  private getPropertyName(prop: ts.PropertyAssignment): string | null {
    if (ts.isIdentifier(prop.name)) {
      return prop.name.text;
    }
    if (ts.isStringLiteral(prop.name)) {
      return prop.name.text;
    }
    return null;
  }

  private getStringValue(prop: ts.PropertyAssignment): string | null {
    if (ts.isStringLiteral(prop.initializer)) {
      return prop.initializer.text;
    }
    return null;
  }
}
