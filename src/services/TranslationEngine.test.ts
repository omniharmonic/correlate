import { describe, it, expect } from 'vitest';
import { TranslationEngine } from './TranslationEngine';
import { Document } from '../shared/types/document';
import { CorrelationMapping } from '../shared/types/correlation';
import { FieldType } from '../shared/types/schema';

describe('TranslationEngine', () => {
  let engine: TranslationEngine;

  beforeEach(() => {
    engine = new TranslationEngine();
  });

  const sourceDoc: Document = {
    filePath: '/path/to/source.md',
    content: 'This is the content.',
    frontmatter: {
      title: 'Source Title',
      author: 'John Doe',
      status: 'draft',
    },
  };

  const mappings: CorrelationMapping[] = [
    { sourceField: { name: 'title', type: FieldType.STRING }, targetField: { name: 'heading', type: FieldType.STRING }, confidence: 1.0 },
    { sourceField: { name: 'author', type: FieldType.STRING }, targetField: { name: 'creator', type: FieldType.STRING }, confidence: 0.8 },
    { sourceField: { name: 'status', type: FieldType.STRING }, targetField: { name: 'state', type: FieldType.STRING }, confidence: 0.4 }, // Low confidence
  ];

  it('should translate frontmatter keys based on high-confidence mappings', () => {
    const translatedDoc = engine.translateDocument(sourceDoc, mappings);
    
    expect(translatedDoc.frontmatter).toHaveProperty('heading', 'Source Title');
    expect(translatedDoc.frontmatter).toHaveProperty('creator', 'John Doe');
  });

  it('should not translate frontmatter keys with low-confidence mappings', () => {
    const translatedDoc = engine.translateDocument(sourceDoc, mappings);

    expect(translatedDoc.frontmatter).not.toHaveProperty('state');
    expect(translatedDoc.frontmatter).not.toHaveProperty('status');
  });

  it('should not carry over unmapped frontmatter keys', () => {
    const docWithUnmapped: Document = {
      ...sourceDoc,
      frontmatter: {
        ...sourceDoc.frontmatter,
        unmapped_key: 'some_value',
      },
    };
    const translatedDoc = engine.translateDocument(docWithUnmapped, mappings);

    expect(translatedDoc.frontmatter).not.toHaveProperty('unmapped_key');
  });

  it('should return a new document object with the original content and path', () => {
    const translatedDoc = engine.translateDocument(sourceDoc, mappings);

    expect(translatedDoc).not.toBe(sourceDoc);
    expect(translatedDoc.filePath).toBe(sourceDoc.filePath);
    expect(translatedDoc.content).toBe(sourceDoc.content);
  });

  it('should translate a batch of documents', async () => {
    const doc1 = { filePath: '/path/1.md', content: '', frontmatter: { title: 'Doc 1' } };
    const doc2 = { filePath: '/path/2.md', content: '', frontmatter: { author: 'Jane' } };
    const docs: Document[] = [doc1, doc2];

    const translatedDocs = await engine.translateBatch(docs, mappings);

    expect(translatedDocs.length).toBe(2);
    expect(translatedDocs[0].frontmatter).toHaveProperty('heading', 'Doc 1');
    expect(translatedDocs[1].frontmatter).toHaveProperty('creator', 'Jane');
  });
}); 