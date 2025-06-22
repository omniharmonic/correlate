import { describe, it, expect } from 'vitest';
import { ValidationEngine } from './ValidationEngine';
import { Document } from '../shared/types/document';
import { YamlSchema, FieldType } from '../shared/types/schema';

describe('ValidationEngine', () => {
  let engine: ValidationEngine;

  beforeEach(() => {
    engine = new ValidationEngine();
  });

  const targetSchema: YamlSchema = {
    name: 'Test Schema',
    version: '1.0',
    fields: [
      { name: 'title', type: FieldType.STRING, required: true },
      { name: 'author', type: FieldType.STRING, required: true },
      { name: 'date', type: FieldType.DATE, required: false },
      { name: 'tags', type: FieldType.ARRAY, required: false },
    ],
  };

  it('should return isValid: true when all required fields are present', () => {
    const doc: Document = {
      filePath: '/path/doc.md',
      content: '',
      frontmatter: {
        title: 'Valid Title',
        author: 'Valid Author',
        date: new Date(),
      },
    };

    const result = engine.validateDocument(doc, targetSchema);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should return isValid: false when a required field is missing', () => {
    const doc: Document = {
      filePath: '/path/doc.md',
      content: '',
      frontmatter: {
        title: 'Invalid Title',
        // 'author' field is missing
      },
    };

    const result = engine.validateDocument(doc, targetSchema);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain('Missing required field');
    expect(result.errors[0].offendingField).toBe('author');
  });

  it('should return isValid: false when multiple required fields are missing', () => {
    const doc: Document = {
      filePath: '/path/doc.md',
      content: '',
      frontmatter: {
        date: new Date(),
      },
    };

    const result = engine.validateDocument(doc, targetSchema);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBe(2);
  });

  it('should return isValid: true when only optional fields are missing', () => {
    const doc: Document = {
      filePath: '/path/doc.md',
      content: '',
      frontmatter: {
        title: 'Valid Title',
        author: 'Valid Author',
      },
    };

    const result = engine.validateDocument(doc, targetSchema);
    expect(result.isValid).toBe(true);
  });
}); 