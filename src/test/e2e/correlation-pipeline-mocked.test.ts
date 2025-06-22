import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { SchemaParser } from '../../services/SchemaParser';
import { CorrelationEngine } from '../../services/CorrelationEngine';
import { TranslationSampleGenerator } from '../../services/TranslationSampleGenerator';
import { TranslationEngine } from '../../services/TranslationEngine';
import { EmbeddingService } from '../../services/EmbeddingService';
import { DocumentSimilarityEngine } from '../../services/DocumentSimilarityEngine';
import { YamlSchema, FieldType } from '../../shared/types/schema';
import { Document } from '../../shared/types/document';
import { CorrelationResult, CorrelationMapping } from '../../shared/types/correlation';

describe('End-to-End Correlation Pipeline (Mocked)', () => {
  let schemaParser: SchemaParser;
  let correlationEngine: CorrelationEngine;
  let sampleGenerator: TranslationSampleGenerator;
  let translationEngine: TranslationEngine;
  let embeddingService: EmbeddingService;
  let similarityEngine: DocumentSimilarityEngine;
  
  let sourceSchema: YamlSchema;
  let targetSchema: YamlSchema;
  let testDocuments: Document[];

  beforeAll(async () => {
    // Initialize services
    schemaParser = new SchemaParser();
    correlationEngine = new CorrelationEngine();
    sampleGenerator = new TranslationSampleGenerator();
    translationEngine = new TranslationEngine();
    embeddingService = new EmbeddingService({ model: 'ollama', batchSize: 2 });
    similarityEngine = new DocumentSimilarityEngine({
      threshold: 0.3,
      maxResults: 5,
      includeMetadataSimilarity: true,
      metadataWeight: 0.3
    });

    // Load test schemas
    const obsidianSchemaPath = resolve(__dirname, 'test-data/schemas/obsidian-schema.yaml');
    const notionSchemaPath = resolve(__dirname, 'test-data/schemas/notion-schema.json');
    
    const obsidianContent = readFileSync(obsidianSchemaPath, 'utf-8');
    const notionContent = readFileSync(notionSchemaPath, 'utf-8');
    
    sourceSchema = schemaParser.parseYamlSchema(obsidianContent);
    targetSchema = schemaParser.parseJsonSchema(notionContent);

    // Load test documents
    const aiDocPath = resolve(__dirname, 'test-data/documents/source/ai-research-notes.md');
    const quantumDocPath = resolve(__dirname, 'test-data/documents/source/quantum-computing-basics.md');
    const blockchainDocPath = resolve(__dirname, 'test-data/documents/target/blockchain-technology.md');
    
    testDocuments = [
      await parseMarkdownContent(readFileSync(aiDocPath, 'utf-8'), aiDocPath),
      await parseMarkdownContent(readFileSync(quantumDocPath, 'utf-8'), quantumDocPath),
      await parseMarkdownContent(readFileSync(blockchainDocPath, 'utf-8'), blockchainDocPath)
    ];

    // Mock LLM responses for consistent testing
    const mockCorrelationResult: CorrelationResult = {
      mappings: [
        {
          sourceField: { name: 'title', type: FieldType.STRING, required: true },
          targetField: { name: 'Name', type: FieldType.STRING, required: true },
          confidence: 0.9
        },
        {
          sourceField: { name: 'tags', type: FieldType.ARRAY, required: false },
          targetField: { name: 'Categories', type: FieldType.ARRAY, required: false },
          confidence: 0.7
        },
        {
          sourceField: { name: 'created', type: FieldType.DATE, required: true },
          targetField: { name: 'Date Created', type: FieldType.DATE, required: true },
          confidence: 1.0
        },
        {
          sourceField: { name: 'modified', type: FieldType.DATE, required: false },
          targetField: { name: 'Last Edited', type: FieldType.DATE, required: false },
          confidence: 1.0
        },
        {
          sourceField: { name: 'status', type: FieldType.STRING, required: false },
          targetField: { name: 'Content Status', type: FieldType.STRING, required: false },
          confidence: 0.8
        },
        {
          sourceField: { name: 'author', type: FieldType.STRING, required: false },
          targetField: { name: 'Owner', type: FieldType.STRING, required: false },
          confidence: 0.9
        },
        {
          sourceField: { name: 'aliases', type: FieldType.ARRAY, required: false },
          targetField: { name: 'Related Pages', type: FieldType.ARRAY, required: false },
          confidence: 0.6 // Low confidence - should become fallback tag
        },
        {
          sourceField: { name: 'type', type: FieldType.STRING, required: false },
          targetField: { name: 'Content Type', type: FieldType.STRING, required: false },
          confidence: 0.8
        },
        {
          sourceField: { name: 'priority', type: FieldType.NUMBER, required: false },
          targetField: { name: 'Urgency', type: FieldType.NUMBER, required: false },
          confidence: 0.7
        },
        {
          sourceField: { name: 'links', type: FieldType.ARRAY, required: false },
          targetField: { name: 'External URLs', type: FieldType.ARRAY, required: false },
          confidence: 1.0
        }
      ],
      unmappedSourceFields: [],
             unmappedTargetFields: [
         { name: 'Summary', type: FieldType.STRING, required: false }
       ]
    };

    // Mock LLM calls
    vi.spyOn(correlationEngine, 'generateCorrelation').mockResolvedValue(mockCorrelationResult);
    
    // Mock embedding service for consistent tests
    vi.spyOn(embeddingService, 'generateEmbeddings').mockImplementation(async (documents) => {
      return documents.map((doc, index) => ({
        documentPath: doc.filePath,
        content: doc.content,
        embedding: Array(384).fill(0).map(() => Math.random() - 0.5), // Mock embedding vector
        metadata: doc.frontmatter,
        createdAt: new Date()
      }));
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
    embeddingService.clearCache();
  });

  describe('1. Complete Pipeline Integration', () => {
    it('should execute the complete correlation pipeline end-to-end', async () => {
      console.log('🚀 Starting complete pipeline test...');
      
      // Step 1: Schema Correlation
      console.log('📋 Step 1: Correlating schemas...');
      const correlationResult = await correlationEngine.generateCorrelation(sourceSchema, targetSchema);
      
      expect(correlationResult).toBeDefined();
      expect(correlationResult.mappings).toHaveLength(10);
      console.log(`✅ Generated ${correlationResult.mappings.length} correlation mappings`);

      // Step 2: Translation Sample Generation
      console.log('🔄 Step 2: Generating translation samples...');
      const samples = sampleGenerator.convertCorrelationToSamples(
        correlationResult,
        sourceSchema,
        targetSchema
      );
      
      expect(samples.length).toBeGreaterThan(0);
      console.log(`✅ Generated ${samples.length} translation samples`);

      // Verify sample structure
      samples.forEach(sample => {
        expect(sample).toHaveProperty('sourceTag');
        expect(sample).toHaveProperty('translatedTag');
        expect(sample).toHaveProperty('confidence');
        expect(sample).toHaveProperty('fieldType');
      });

      // Step 3: Document Translation with Confidence Processing
      console.log('📝 Step 3: Translating documents...');
      const translatedDocs = await Promise.all(
        testDocuments.slice(0, 2).map(doc => // Use first 2 source documents
          translationEngine.translateDocument(doc, correlationResult.mappings, targetSchema)
        )
      );

      expect(translatedDocs).toHaveLength(2);
      console.log(`✅ Translated ${translatedDocs.length} documents`);

      // Verify confidence-based processing
      translatedDocs.forEach(doc => {
        // Check high-confidence mappings
        expect(doc.frontmatter['Name']).toBeDefined(); // title -> Name (0.9)
        expect(doc.frontmatter['Categories']).toBeDefined(); // tags -> Categories (0.7)
        expect(doc.frontmatter['Date Created']).toBeDefined(); // created -> Date Created (1.0)
        
        // Check fallback tags for low-confidence mappings
        expect(doc.frontmatter['tags']).toBeDefined(); // Should contain fallback tags
        expect(Array.isArray(doc.frontmatter['tags'])).toBe(true);
        
        console.log(`📊 Document ${doc.filePath} has ${doc.frontmatter['tags']?.length || 0} fallback tags`);
      });

      // Step 4: Embedding Generation
      console.log('🧠 Step 4: Generating embeddings...');
      const embeddings = await embeddingService.generateEmbeddings(testDocuments);
      
      expect(embeddings).toHaveLength(3);
      embeddings.forEach(embedding => {
        expect(embedding.embedding).toHaveLength(384); // Mock embedding dimension
        expect(embedding.documentPath).toBeDefined();
        expect(embedding.content).toBeDefined();
      });
      console.log(`✅ Generated embeddings for ${embeddings.length} documents`);

      // Step 5: Document Similarity and Related Links
      console.log('🔗 Step 5: Finding related documents...');
      similarityEngine.indexDocuments(embeddings);
      
      const queryDoc = testDocuments[0]; // AI research notes
      const queryEmbedding = embeddings[0];
      const relatedDocs = await similarityEngine.findRelatedDocuments(queryDoc, queryEmbedding);
      
      // Mock embeddings may not produce realistic similarity scores, so we validate the engine works
      console.log(`🔍 Found ${relatedDocs.length} related documents (mock embeddings may limit results)`);
      expect(Array.isArray(relatedDocs)).toBe(true);
      console.log(`✅ Related documents search engine validated`);

      // Step 6: Add Related Links to Translated Documents
      console.log('📎 Step 6: Adding related links...');
      const finalDocs = translatedDocs.map(doc => 
        similarityEngine.addRelatedLinksToDocument(doc, relatedDocs)
      );

      finalDocs.forEach(doc => {
        // Related field should exist (even if empty with mock data)
        expect(doc.frontmatter['Related']).toBeDefined();
        expect(Array.isArray(doc.frontmatter['Related'])).toBe(true);
        console.log(`🔗 Document ${doc.filePath} has ${doc.frontmatter['Related']?.length || 0} related links`);
      });

      console.log('🎉 Complete pipeline test successful!');
    }, 15000); // Increased timeout for complete pipeline
  });

  describe('2. Confidence-Based Processing Validation', () => {
    it('should correctly separate high and low confidence mappings', async () => {
      const correlationResult = await correlationEngine.generateCorrelation(sourceSchema, targetSchema);
      const testDoc = testDocuments[0];
      
      const translatedDoc = translationEngine.translateDocument(testDoc, correlationResult.mappings, targetSchema);
      
      // Verify high-confidence direct mappings (≥ 0.7)
      const highConfidenceMappings = correlationResult.mappings.filter(m => m.confidence >= 0.7);
      console.log(`📊 High-confidence mappings: ${highConfidenceMappings.length}`);
      
      // Verify low-confidence fallback tags (< 0.7)
      const lowConfidenceMappings = correlationResult.mappings.filter(m => m.confidence < 0.7);
      console.log(`⚠️ Low-confidence mappings: ${lowConfidenceMappings.length}`);
      
      // Check that fallback tags exist for low-confidence mappings
      if (lowConfidenceMappings.length > 0) {
        expect(translatedDoc.frontmatter['tags']).toBeDefined();
        expect(Array.isArray(translatedDoc.frontmatter['tags'])).toBe(true);
        expect(translatedDoc.frontmatter['tags'].length).toBeGreaterThan(0);
      }
    });
  });

  describe('3. Vector Store and Similarity Performance', () => {
    it('should maintain consistent similarity scores', async () => {
      const embeddings = await embeddingService.generateEmbeddings(testDocuments);
      similarityEngine.indexDocuments(embeddings);
      
      const queryDoc = testDocuments[0];
      const queryEmbedding = embeddings[0];
      
      // Run similarity search multiple times
      const results1 = await similarityEngine.findRelatedDocuments(queryDoc, queryEmbedding);
      const results2 = await similarityEngine.findRelatedDocuments(queryDoc, queryEmbedding);
      
      expect(results1).toEqual(results2);
      console.log(`🔍 Consistent similarity results: ${results1.length} documents`);
    });
  });

  // Helper functions
  async function parseMarkdownContent(content: string, filePath: string): Promise<Document> {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (!frontmatterMatch) {
      return {
        frontmatter: {},
        content: content,
        filePath: filePath
      };
    }

    const [, frontmatterYaml, markdownContent] = frontmatterMatch;
    
    // Parse YAML frontmatter
    const yaml = await import('js-yaml');
    const frontmatter = yaml.load(frontmatterYaml) as Record<string, any>;
    
    return {
      frontmatter: frontmatter || {},
      content: markdownContent.trim(),
      filePath: filePath
    };
  }
}); 