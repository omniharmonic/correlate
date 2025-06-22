import { describe, it, expect } from 'vitest';
import { SchemaComparator } from './SchemaComparator';
import { YamlSchema, FieldType } from '../shared/types/schema';

describe('SchemaComparator', () => {
  const comparator = new SchemaComparator();

  const sourceSchema: YamlSchema = {
    name: 'Source',
    version: '1.0',
    fields: [
      { name: 'title', type: FieldType.STRING },
      { name: 'author', type: FieldType.STRING },
      { name: 'publishedDate', type: FieldType.DATE },
      { name: 'uniqueField', type: FieldType.STRING },
    ],
  };

  const targetSchema: YamlSchema = {
    name: 'Target',
    version: '1.0',
    fields: [
      { name: 'title', type: FieldType.STRING },
      { name: 'author', type: FieldType.NUMBER }, // Different type
      { name: 'publicationDate', type: FieldType.DATE },
      { name: 'anotherField', type: FieldType.BOOLEAN },
    ],
  };

  it('should find mappings for fields with the same name', () => {
    const result = comparator.compareSchemas(sourceSchema, targetSchema);
    expect(result.mappings).toHaveLength(2);
  });

  it('should assign confidence 1.0 for fields with matching name and type', () => {
    const result = comparator.compareSchemas(sourceSchema, targetSchema);
    const titleMapping = result.mappings.find(m => m.sourceField.name === 'title');
    expect(titleMapping).toBeDefined();
    expect(titleMapping?.confidence).toBe(1.0);
  });

  it('should assign confidence 0.5 for fields with matching name but different type', () => {
    const result = comparator.compareSchemas(sourceSchema, targetSchema);
    const authorMapping = result.mappings.find(m => m.sourceField.name === 'author');
    expect(authorMapping).toBeDefined();
    expect(authorMapping?.confidence).toBe(0.5);
  });

  it('should identify unmapped source fields', () => {
    const result = comparator.compareSchemas(sourceSchema, targetSchema);
    expect(result.unmappedSourceFields).toHaveLength(2);
    expect(result.unmappedSourceFields.map(f => f.name)).toEqual(['publishedDate', 'uniqueField']);
  });

  it('should identify unmapped target fields', () => {
    const result = comparator.compareSchemas(sourceSchema, targetSchema);
    expect(result.unmappedTargetFields).toHaveLength(2);
    expect(result.unmappedTargetFields.map(f => f.name)).toEqual(['publicationDate', 'anotherField']);
  });
}); 