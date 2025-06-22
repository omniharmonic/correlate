import { describe, it, expect } from 'vitest';
import { TranslationSampleGenerator } from './TranslationSampleGenerator';
import { CorrelationResult, CorrelationMapping } from '../shared/types/correlation';
import { YamlSchema, SchemaField, FieldType } from '../shared/types/schema';

describe('TranslationSampleGenerator', () => {
  const generator = new TranslationSampleGenerator();

  const mockSourceSchema: YamlSchema = {
    name: 'blog-schema',
    version: '1.0',
    description: 'Blog post schema',
    fields: [
      { name: 'status', type: FieldType.STRING, description: 'Publication status' },
      { name: 'type', type: FieldType.STRING, description: 'Content type' },
      { name: 'tags', type: FieldType.ARRAY, description: 'Topic tags' }
    ]
  };

  const mockTargetSchema: YamlSchema = {
    name: 'cms-schema',
    version: '1.0',
    description: 'CMS content schema',
    fields: [
      { name: 'publicationState', type: FieldType.STRING, description: 'Publication state' },
      { name: 'contentType', type: FieldType.STRING, description: 'Type of content' },
      { name: 'categories', type: FieldType.ARRAY, description: 'Content categories' }
    ]
  };

  const mockCorrelationResult: CorrelationResult = {
    mappings: [
      {
        sourceField: { name: 'status', type: FieldType.STRING },
        targetField: { name: 'publicationState', type: FieldType.STRING },
        confidence: 0.9,
        suggestions: [
          { targetField: { name: 'state', type: FieldType.STRING }, confidence: 0.7 }
        ]
      },
      {
        sourceField: { name: 'type', type: FieldType.STRING },
        targetField: { name: 'contentType', type: FieldType.STRING },
        confidence: 0.8
      },
      {
        sourceField: { name: 'tags', type: FieldType.ARRAY },
        targetField: { name: 'categories', type: FieldType.ARRAY },
        confidence: 0.5
      }
    ],
    unmappedSourceFields: [
      { name: 'author', type: FieldType.STRING }
    ],
    unmappedTargetFields: []
  };

  describe('convertCorrelationToSamples', () => {
    it('should convert correlation results to translation samples', () => {
      const samples = generator.convertCorrelationToSamples(
        mockCorrelationResult,
        mockSourceSchema,
        mockTargetSchema
      );

      expect(samples).toHaveLength(4); // 3 mappings + 1 fallback
      expect(samples[0].confidence).toBe(0.9); // Highest confidence first
      expect(samples[0].sourceTag).toContain('status: "draft"');
      expect(samples[0].translatedTag).toContain('publicationState: "provisional"');
    });

    it('should include confidence scores for all samples', () => {
      const samples = generator.convertCorrelationToSamples(
        mockCorrelationResult,
        mockSourceSchema,
        mockTargetSchema
      );

      samples.forEach(sample => {
        expect(sample.confidence).toBeDefined();
        expect(typeof sample.confidence).toBe('number');
      });
    });

    it('should include alternatives for high-confidence mappings', () => {
      const samples = generator.convertCorrelationToSamples(
        mockCorrelationResult,
        mockSourceSchema,
        mockTargetSchema
      );

      const highConfidenceSample = samples.find(s => s.confidence >= 0.7);
      expect(highConfidenceSample?.alternatives).toBeDefined();
      expect(highConfidenceSample?.alternatives?.length).toBeGreaterThan(0);
    });

    it('should generate fallback tag samples for unmapped fields', () => {
      const samples = generator.convertCorrelationToSamples(
        mockCorrelationResult,
        mockSourceSchema,
        mockTargetSchema
      );

      const fallbackSample = samples.find(s => s.confidence === 0.0);
      expect(fallbackSample).toBeDefined();
      expect(fallbackSample?.sourceTag).toContain('author:');
      expect(fallbackSample?.translatedTag).toContain('tags:');
    });

    it('should sort samples by confidence (highest first)', () => {
      const samples = generator.convertCorrelationToSamples(
        mockCorrelationResult,
        mockSourceSchema,
        mockTargetSchema
      );

      // Check that high-confidence samples come before medium-confidence ones
      const highConfidenceIndex = samples.findIndex(s => s.confidence >= 0.7);
      const mediumConfidenceIndex = samples.findIndex(s => s.confidence >= 0.4 && s.confidence < 0.7);
      
      if (highConfidenceIndex !== -1 && mediumConfidenceIndex !== -1) {
        expect(highConfidenceIndex).toBeLessThan(mediumConfidenceIndex);
      }
    });
  });

  describe('sample value generation', () => {
    it('should generate appropriate values for string fields', () => {
      const statusField: SchemaField = { name: 'status', type: FieldType.STRING };
      const typeField: SchemaField = { name: 'type', type: FieldType.STRING };
      
      const correlationWithStatus: CorrelationResult = {
        mappings: [{
          sourceField: statusField,
          targetField: { name: 'state', type: FieldType.STRING },
          confidence: 0.8
        }],
        unmappedSourceFields: [],
        unmappedTargetFields: []
      };

      const samples = generator.convertCorrelationToSamples(
        correlationWithStatus,
        mockSourceSchema,
        mockTargetSchema
      );

      expect(samples[0].sourceTag).toContain('"draft"');
    });

    it('should generate appropriate values for array fields', () => {
      const tagsField: SchemaField = { name: 'tags', type: FieldType.ARRAY };
      
      const correlationWithTags: CorrelationResult = {
        mappings: [{
          sourceField: tagsField,
          targetField: { name: 'categories', type: FieldType.ARRAY },
          confidence: 0.8
        }],
        unmappedSourceFields: [],
        unmappedTargetFields: []
      };

      const samples = generator.convertCorrelationToSamples(
        correlationWithTags,
        mockSourceSchema,
        mockTargetSchema
      );

      expect(samples[0].sourceTag).toContain('["web", "development"]');
    });

    it('should generate appropriate values for date fields', () => {
      const dateField: SchemaField = { name: 'date', type: FieldType.DATE };
      
      const correlationWithDate: CorrelationResult = {
        mappings: [{
          sourceField: dateField,
          targetField: { name: 'publishedAt', type: FieldType.DATE },
          confidence: 0.8
        }],
        unmappedSourceFields: [],
        unmappedTargetFields: []
      };

      const samples = generator.convertCorrelationToSamples(
        correlationWithDate,
        mockSourceSchema,
        mockTargetSchema
      );

      expect(samples[0].sourceTag).toContain('2024-01-15');
      expect(samples[0].translatedTag).toContain('2024-01-15T00:00:00Z');
    });
  });

  describe('value transformation', () => {
    it('should transform status values appropriately', () => {
      const statusMapping: CorrelationMapping = {
        sourceField: { name: 'status', type: FieldType.STRING },
        targetField: { name: 'publicationState', type: FieldType.STRING },
        confidence: 0.9
      };

      const correlationWithStatus: CorrelationResult = {
        mappings: [statusMapping],
        unmappedSourceFields: [],
        unmappedTargetFields: []
      };

      const samples = generator.convertCorrelationToSamples(
        correlationWithStatus,
        mockSourceSchema,
        mockTargetSchema
      );

      expect(samples[0].translatedTag).toContain('publicationState: "provisional"');
    });

    it('should transform content type values appropriately', () => {
      const typeMapping: CorrelationMapping = {
        sourceField: { name: 'type', type: FieldType.STRING },
        targetField: { name: 'contentType', type: FieldType.STRING },
        confidence: 0.8
      };

      const correlationWithType: CorrelationResult = {
        mappings: [typeMapping],
        unmappedSourceFields: [],
        unmappedTargetFields: []
      };

      const samples = generator.convertCorrelationToSamples(
        correlationWithType,
        mockSourceSchema,
        mockTargetSchema
      );

      expect(samples[0].translatedTag).toContain('contentType: "article"');
    });
  });
}); 