import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigLoader } from './ConfigLoader';

describe('ConfigLoader', () => {
  let loader: ConfigLoader;
  let testConfigPath: string;

  beforeEach(() => {
    // Use unique file name for each test to avoid caching issues
    testConfigPath = path.resolve(
      __dirname,
      `test-config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.ts`
    );
    loader = new ConfigLoader(testConfigPath);
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  describe('load', () => {
    it('should load and validate a valid config file', async () => {
      const configContent = `
        export default {
          databases: [
            {
              id: null,
              name: 'TestDB',
              displayName: 'Test Database',
              notionName: 'Test',
              properties: [
                {
                  id: null,
                  name: 'title',
                  displayName: 'Title',
                  notionName: 'Title',
                  type: 'title'
                }
              ]
            }
          ],
          output: {
            path: './generated'
          }
        };
      `;

      fs.writeFileSync(testConfigPath, configContent);

      const config = await loader.load();

      expect(config.databases).toHaveLength(1);
      expect(config.databases[0].name).toBe('TestDB');
      expect(config.output.path).toBe('./generated');
    });

    it('should throw error when config file does not exist', async () => {
      await expect(loader.load()).rejects.toThrow('Config file not found');
    });

    it('should validate required database fields', async () => {
      const invalidConfig = `export default {
  databases: [
    {
      id: null,
      displayName: 'Test Database',
      notionName: 'Test',
      properties: []
    }
  ],
  output: {
    path: './generated'
  }
};`;

      fs.writeFileSync(testConfigPath, invalidConfig);

      await expect(loader.load()).rejects.toThrow('Database must have a name string');
    });

    it('should validate required property fields', async () => {
      const invalidConfig = `export default {
  databases: [
    {
      id: null,
      name: 'TestDB',
      displayName: 'Test Database',
      notionName: 'Test',
      properties: [
        {
          id: null,
          name: 'title',
          notionName: 'Title',
          type: 'title'
        }
      ]
    }
  ],
  output: {
    path: './generated'
  }
};`;

      fs.writeFileSync(testConfigPath, invalidConfig);

      await expect(loader.load()).rejects.toThrow(
        'Property title in database TestDB must have a displayName string'
      );
    });

    it('should accept null type for properties', async () => {
      const configWithNullType = `export default {
  databases: [
    {
      id: null,
      name: 'TestDB',
      displayName: 'Test Database',
      notionName: 'Test',
      properties: [
        {
          id: null,
          name: 'unknownProp',
          displayName: 'Unknown',
          notionName: 'Unknown',
          type: null
        }
      ]
    }
  ],
  output: {
    path: './generated'
  }
};`;

      fs.writeFileSync(testConfigPath, configWithNullType);

      const config = await loader.load();

      expect(config.databases[0].properties[0].type).toBeNull();
    });

    it('should validate output configuration', async () => {
      const invalidOutputConfig = `export default {
  databases: [],
  output: {
  }
};`;

      fs.writeFileSync(testConfigPath, invalidOutputConfig);

      await expect(loader.load()).rejects.toThrow('Config output must have a path string');
    });
  });

  describe('getConfigPath', () => {
    it('should return the config path', () => {
      expect(loader.getConfigPath()).toBe(testConfigPath);
    });

    it('should use default path when not specified', () => {
      const defaultLoader = new ConfigLoader();
      expect(defaultLoader.getConfigPath()).toBe(
        path.resolve(process.cwd(), 'notion-typed.config.ts')
      );
    });

    it('should resolve relative paths to absolute paths', () => {
      const relativePath = './test-config.ts';
      const relativeLoader = new ConfigLoader(relativePath);
      const expectedAbsolutePath = path.resolve(process.cwd(), relativePath);
      expect(relativeLoader.getConfigPath()).toBe(expectedAbsolutePath);
    });

    it('should keep absolute paths unchanged', () => {
      const absolutePath = '/absolute/path/to/config.ts';
      const absoluteLoader = new ConfigLoader(absolutePath);
      expect(absoluteLoader.getConfigPath()).toBe(absolutePath);
    });

    it('should resolve complex relative paths correctly', () => {
      const relativePath = '../parent/config.ts';
      const relativeLoader = new ConfigLoader(relativePath);
      const expectedAbsolutePath = path.resolve(process.cwd(), relativePath);
      expect(relativeLoader.getConfigPath()).toBe(expectedAbsolutePath);
    });
  });

  describe('relative path configuration loading', () => {
    it('should successfully load config file using relative path', async () => {
      // Create a config file in current directory
      const relativeConfigPath = './relative-config.ts';
      const absoluteConfigPath = path.resolve(process.cwd(), relativeConfigPath);

      const configContent = `
        export default {
          databases: [
            {
              id: null,
              name: 'RelativeTestDB',
              displayName: 'Relative Test Database',
              notionName: 'RelativeTest',
              properties: [
                {
                  id: null,
                  name: 'title',
                  displayName: 'Title',
                  notionName: 'Title',
                  type: 'title'
                }
              ]
            }
          ],
          output: {
            path: './generated'
          }
        };
      `;

      // Write config file
      fs.writeFileSync(absoluteConfigPath, configContent);

      try {
        // Create loader with relative path
        const relativeLoader = new ConfigLoader(relativeConfigPath);
        const config = await relativeLoader.load();

        expect(config.databases).toHaveLength(1);
        expect(config.databases[0].name).toBe('RelativeTestDB');
        expect(config.output.path).toBe('./generated');
      } finally {
        // Clean up
        if (fs.existsSync(absoluteConfigPath)) {
          fs.unlinkSync(absoluteConfigPath);
        }
      }
    });
  });
});
