import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileSystemManager } from './FileSystemManager';
import fs from 'fs/promises';
import path from 'path';

describe('FileSystemManager - Schema Detection Integration', () => {
  let fsManager: FileSystemManager;
  let testDir: string;

  beforeEach(async () => {
    fsManager = new FileSystemManager();
    testDir = path.join(__dirname, '../../test-schemas-temp');
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should detect and parse YAML schema files', async () => {
    const yamlSchema = `
name: Test YAML Schema
version: 1.0.0
description: A test schema in YAML format
fields:
  - name: title
    type: string
    required: true
  - name: author
    type: string
  - name: publishDate
    type: date
`;

    await fs.writeFile(path.join(testDir, 'schema.yml'), yamlSchema);

    const foundFiles = await fsManager.listPotentialSchemaFiles(testDir);
    expect(foundFiles.length).toBeGreaterThan(0);

    const schema = await fsManager.detectAndParseSchema(testDir);
    expect(schema).not.toBeNull();
    expect(schema!.name).toBe('Test YAML Schema');
    expect(schema!.version).toBe('1.0.0');
    expect(schema!.fields).toHaveLength(3);
  });

  it('should detect and parse JSON schema files', async () => {
    const jsonSchema = {
      name: "Test JSON Schema",
      version: "1.0.0",
      description: "A test schema in JSON format",
      fields: [
        {
          name: "title",
          type: "string",
          required: true
        },
        {
          name: "category",
          type: "string"
        },
        {
          name: "tags",
          type: "array"
        }
      ]
    };

    await fs.writeFile(path.join(testDir, 'schema.json'), JSON.stringify(jsonSchema, null, 2));

    const foundFiles = await fsManager.listPotentialSchemaFiles(testDir);
    expect(foundFiles.length).toBeGreaterThan(0);

    const schema = await fsManager.detectAndParseSchema(testDir);
    expect(schema).not.toBeNull();
    expect(schema!.name).toBe('Test JSON Schema');
    expect(schema!.version).toBe('1.0.0');
    expect(schema!.fields).toHaveLength(3);
  });

  it('should detect various schema file naming patterns', async () => {
    const yamlSchema = `
name: Test Schema
version: 1.0.0
fields:
  - name: title
    type: string
`;

    // Test different naming patterns
    const testFiles = [
      'my-project-schema.yml',
      'project_schema.yaml',
      'ProjectSchema.json'
    ];

    for (const fileName of testFiles) {
      const testDirForFile = path.join(testDir, fileName.replace(/[^a-zA-Z0-9]/g, '-'));
      await fs.mkdir(testDirForFile, { recursive: true });
      
      const content = fileName.endsWith('.json') 
        ? JSON.stringify({
            name: "Test Schema",
            version: "1.0.0",
            fields: [{ name: "title", type: "string" }]
          })
        : yamlSchema;
      
      await fs.writeFile(path.join(testDirForFile, fileName), content);

      const schema = await fsManager.detectAndParseSchema(testDirForFile);
      expect(schema).not.toBeNull();
      expect(schema!.name).toBe('Test Schema');
    }
  });

  it('should return null when no schema files are found', async () => {
    // Create a directory with no schema files
    await fs.writeFile(path.join(testDir, 'README.md'), '# Test');
    await fs.writeFile(path.join(testDir, 'data.txt'), 'some data');

    const schema = await fsManager.detectAndParseSchema(testDir);
    expect(schema).toBeNull();
  });

  it('should handle invalid schema files gracefully', async () => {
    // Create an invalid JSON file
    await fs.writeFile(path.join(testDir, 'schema.json'), '{ invalid json');
    
    const schema = await fsManager.detectAndParseSchema(testDir);
    expect(schema).toBeNull();
  });

  it('should detect any JSON/YAML file as a schema when no specific schema files exist', async () => {
    const yamlSchema = `
name: Research Articles Schema
version: 1.0.0
description: Schema for research articles
fields:
  - name: title
    type: string
    required: true
  - name: authors
    type: array
  - name: publishDate
    type: date
`;

    const jsonSchema = {
      name: "People Profiles Schema",
      version: "1.0.0", 
      description: "Schema for people profiles",
      fields: [
        {
          name: "name",
          type: "string",
          required: true
        },
        {
          name: "bio",
          type: "string"
        },
        {
          name: "avatar",
          type: "string"
        }
      ]
    };

    // Create files with names similar to user's real files
    await fs.writeFile(path.join(testDir, 'research_articles.yaml'), yamlSchema);
    await fs.writeFile(path.join(testDir, 'people_profiles.json'), JSON.stringify(jsonSchema, null, 2));

    // Test YAML file detection
    const yamlTestDir = path.join(testDir, 'yaml-test');
    await fs.mkdir(yamlTestDir);
    await fs.writeFile(path.join(yamlTestDir, 'research_articles.yaml'), yamlSchema);

    const foundYamlSchema = await fsManager.detectAndParseSchema(yamlTestDir);
    expect(foundYamlSchema).not.toBeNull();
    expect(foundYamlSchema!.name).toBe('Research Articles Schema');

    // Test JSON file detection
    const jsonTestDir = path.join(testDir, 'json-test');
    await fs.mkdir(jsonTestDir);
    await fs.writeFile(path.join(jsonTestDir, 'people_profiles.json'), JSON.stringify(jsonSchema, null, 2));

    const foundJsonSchema = await fsManager.detectAndParseSchema(jsonTestDir);
    expect(foundJsonSchema).not.toBeNull();
    expect(foundJsonSchema!.name).toBe('People Profiles Schema');
  });
}); 