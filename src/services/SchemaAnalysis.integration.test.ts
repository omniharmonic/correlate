import { describe, it, expect } from 'vitest';
import { SchemaParser } from './SchemaParser';
import { SchemaComparator } from './SchemaComparator';
import { FieldType } from '../shared/types/schema';

describe('SchemaAnalysis Integration Test', () => {
  const parser = new SchemaParser();
  const comparator = new SchemaComparator();

  const sourceSchemaContent = `
name: Source Schema
version: 1.0.0
fields:
  - name: title
    type: string
  - name: author
    type: string
  - name: year
    type: number
`;

  const targetSchemaContent = `
name: Target Schema
version: 1.0.0
fields:
  - name: title
    type: string
  - name: creator
    type: string
  - name: year
    type: string 
`;

  it('should parse two schemas and then compare them successfully', () => {
    // 1. Parse schemas
    const sourceSchema = parser.parseYamlSchema(sourceSchemaContent);
    const targetSchema = parser.parseYamlSchema(targetSchemaContent);

    expect(sourceSchema).toBeDefined();
    expect(targetSchema).toBeDefined();

    // 2. Compare schemas
    const result = comparator.compareSchemas(sourceSchema, targetSchema);

    // 3. Assert results
    expect(result.mappings).toHaveLength(2);

    const titleMapping = result.mappings.find(m => m.sourceField.name === 'title');
    expect(titleMapping).toBeDefined();
    expect(titleMapping?.targetField.name).toBe('title');
    expect(titleMapping?.confidence).toBe(1.0); // Name and type match

    const yearMapping = result.mappings.find(m => m.sourceField.name === 'year');
    expect(yearMapping).toBeDefined();
    expect(yearMapping?.targetField.name).toBe('year');
    expect(yearMapping?.confidence).toBe(0.5); // Name matches, type does not

    expect(result.unmappedSourceFields).toHaveLength(1);
    expect(result.unmappedSourceFields[0].name).toBe('author');

    expect(result.unmappedTargetFields).toHaveLength(1);
    expect(result.unmappedTargetFields[0].name).toBe('creator');
  });
}); 