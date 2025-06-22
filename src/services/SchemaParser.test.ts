import { describe, it, expect } from 'vitest';
import { SchemaParser } from './SchemaParser';
import { FieldType } from '../shared/types/schema';

describe('SchemaParser', () => {
  const parser = new SchemaParser();
  const validSchemaContent = `
name: Test Schema
version: 1.0.0
fields:
  - name: title
    type: string
  - name: author
    type: string
`;

  const validJsonSchemaContent = `{
    "name": "Test JSON Schema",
    "version": "1.0.0",
    "fields": [
      {
        "name": "title",
        "type": "string"
      },
      {
        "name": "author", 
        "type": "string"
      }
    ]
  }`;

  const invalidSchemaContent = `
name: Invalid Schema
version: 1.0.0
fields:
  - name: title
    # type is missing
`;

  const invalidYaml = 'key: value: another';
  const invalidJson = '{"name": "test", "version":}';

  it('should parse a valid YAML schema', () => {
    const schema = parser.parseYamlSchema(validSchemaContent);
    expect(schema.name).toBe('Test Schema');
    expect(schema.version).toBe('1.0.0');
    expect(schema.fields).toHaveLength(2);
    expect(schema.fields[0].name).toBe('title');
    expect(schema.fields[0].type).toBe(FieldType.STRING);
  });

  it('should parse a valid JSON schema', () => {
    const schema = parser.parseJsonSchema(validJsonSchemaContent);
    expect(schema.name).toBe('Test JSON Schema');
    expect(schema.version).toBe('1.0.0');
    expect(schema.fields).toHaveLength(2);
    expect(schema.fields[0].name).toBe('title');
    expect(schema.fields[0].type).toBe(FieldType.STRING);
  });

  it('should parse schema based on file extension', () => {
    const yamlSchema = parser.parseSchema(validSchemaContent, 'schema.yaml');
    expect(yamlSchema.name).toBe('Test Schema');
    
    const jsonSchema = parser.parseSchema(validJsonSchemaContent, 'schema.json');
    expect(jsonSchema.name).toBe('Test JSON Schema');
  });

  it('should throw an error for invalid YAML', () => {
    expect(() => parser.parseYamlSchema(invalidYaml)).toThrow('Failed to parse YAML schema');
  });

  it('should throw an error for invalid JSON', () => {
    expect(() => parser.parseJsonSchema(invalidJson)).toThrow('Failed to parse JSON schema');
  });

  it('should auto-generate schema from incomplete structure', () => {
    const invalidStructure = `
name: Invalid Structure
version: '1.0'
# fields is missing
`;
    // This should now auto-generate a schema instead of throwing
    const schema = parser.parseYamlSchema(invalidStructure);
    expect(schema.name).toBe('yaml-file');
    expect(schema.fields).toHaveLength(2); // name and version become fields
    expect(schema.fields.find(f => f.name === 'name')?.type).toBe(FieldType.STRING);
    expect(schema.fields.find(f => f.name === 'version')?.type).toBe(FieldType.STRING);
  });


  it('should validate a correct schema', () => {
    const schema = parser.parseYamlSchema(validSchemaContent);
    const result = parser.validateSchema(schema);
    expect(result.isValid).toBe(true);
    expect(result.errors).toBeUndefined();
    expect(result.validatedObject).toEqual(schema);
  });

  it('should return errors for an invalid schema', () => {
    const schema = {
        name: 'test',
        version: '1.0',
        fields: [{ name: 'test', type: FieldType.STRING }, { name: 'test2' }]
    } as any;
    const result = parser.validateSchema(schema);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('Field is missing name or type');
    expect(result.errors[0].offendingField).toBe('fields[1]');
  });

  it('should extract taxonomy from a schema', () => {
    const schema = parser.parseYamlSchema(validSchemaContent);
    const taxonomy = parser.extractTaxonomy(schema);
    expect(taxonomy.name).toBe('Test Schema Taxonomy');
    expect(taxonomy.terms).toEqual(['title', 'author']);
  });

  it('should auto-generate schema from any data structure', () => {
    // Test with a simple object (like what the user might have)
    const userData = {
      title: "Sample Article",
      author: "John Doe", 
      publishDate: "2023-01-01",
      tags: ["research", "academic"],
      isPublished: true,
      viewCount: 42
    };
    
    const userJsonContent = JSON.stringify(userData, null, 2);
    const schema = parser.parseJsonSchema(userJsonContent);
    
    expect(schema.name).toBe('json-file');
    expect(schema.version).toBe('1.0.0');
    expect(schema.fields).toHaveLength(6);
    expect(schema.fields.find(f => f.name === 'title')?.type).toBe(FieldType.STRING);
    expect(schema.fields.find(f => f.name === 'publishDate')?.type).toBe(FieldType.DATE);
    expect(schema.fields.find(f => f.name === 'tags')?.type).toBe(FieldType.ARRAY);
    expect(schema.fields.find(f => f.name === 'isPublished')?.type).toBe(FieldType.BOOLEAN);
    expect(schema.fields.find(f => f.name === 'viewCount')?.type).toBe(FieldType.NUMBER);
  });

  it('should not throw error for any valid data structure', () => {
    // Test data that doesn't match our schema format but is valid JSON
    const anyValidData = {
      some_field: "value",
      another_field: 123
    };
    
    const jsonContent = JSON.stringify(anyValidData, null, 2);
    
    // This should not throw an error anymore
    expect(() => parser.parseJsonSchema(jsonContent)).not.toThrow();
    
    const schema = parser.parseJsonSchema(jsonContent);
    expect(schema.fields).toHaveLength(2);
    expect(schema.fields[0].name).toBe('some_field');
    expect(schema.fields[1].name).toBe('another_field');
  });
}); 