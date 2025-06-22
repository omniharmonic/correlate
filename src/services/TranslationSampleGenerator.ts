import { CorrelationResult, CorrelationMapping } from '../shared/types/correlation';
import { TranslationSample } from '../shared/types/translation';
import { YamlSchema, SchemaField } from '../shared/types/schema';

export interface EnhancedTranslationSample extends TranslationSample {
  confidence: number;
  alternatives?: string[];
  fieldType: string;
}

export class TranslationSampleGenerator {
  
  /**
   * Converts a CorrelationResult into reviewable TranslationSample objects
   * @param correlationResult - The result from schema correlation
   * @param sourceSchema - Source schema for context
   * @param targetSchema - Target schema for context
   * @returns Array of translation samples for user review
   */
  public convertCorrelationToSamples(
    correlationResult: CorrelationResult,
    sourceSchema: YamlSchema,
    targetSchema: YamlSchema
  ): EnhancedTranslationSample[] {
    const samples: EnhancedTranslationSample[] = [];

    // Generate samples from high-confidence mappings first
    const highConfidenceMappings = correlationResult.mappings
      .filter(mapping => mapping.confidence >= 0.7)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Take top 5 high-confidence mappings

    samples.push(...this.generateSamplesFromMappings(highConfidenceMappings));

    // Add some medium-confidence mappings for user review
    const mediumConfidenceMappings = correlationResult.mappings
      .filter(mapping => mapping.confidence >= 0.4 && mapping.confidence < 0.7)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Take top 3 medium-confidence mappings

    samples.push(...this.generateSamplesFromMappings(mediumConfidenceMappings));

    // Add samples for unmapped fields that will become fallback tags
    if (correlationResult.unmappedSourceFields.length > 0) {
      const fallbackSamples = this.generateFallbackTagSamples(
        correlationResult.unmappedSourceFields.slice(0, 2) // Take 2 examples
      );
      samples.push(...fallbackSamples);
    }

    return samples;
  }

  /**
   * Generates realistic translation samples from correlation mappings
   * @param mappings - Array of correlation mappings
   * @returns Array of translation samples
   */
  private generateSamplesFromMappings(mappings: CorrelationMapping[]): EnhancedTranslationSample[] {
    return mappings.map(mapping => {
      const sourceTag = this.createSampleSourceTag(mapping.sourceField);
      const translatedTag = this.createSampleTargetTag(mapping.targetField, sourceTag);
      
      const alternatives = mapping.suggestions?.map(suggestion => 
        this.createSampleTargetTag(suggestion.targetField, sourceTag)
      ) || [];

      return {
        sourceTag,
        translatedTag,
        confidence: mapping.confidence,
        alternatives,
        fieldType: mapping.sourceField.type
      };
    });
  }

  /**
   * Generates samples for unmapped fields that will become fallback tags
   * @param unmappedFields - Fields that couldn't be mapped
   * @returns Array of fallback tag samples
   */
  private generateFallbackTagSamples(unmappedFields: SchemaField[]): EnhancedTranslationSample[] {
    return unmappedFields.map(field => {
      const sourceTag = this.createSampleSourceTag(field);
      const fallbackTag = `tags: [${this.extractValueFromSample(sourceTag)}]`;

      return {
        sourceTag,
        translatedTag: fallbackTag,
        confidence: 0.0, // Low confidence indicates fallback
        alternatives: [`tags: ["${field.name}"]`], // Alternative format
        fieldType: field.type
      };
    });
  }

  /**
   * Creates a realistic sample source tag based on field definition
   * @param field - Source schema field
   * @returns Sample tag in YAML format
   */
  private createSampleSourceTag(field: SchemaField): string {
    const sampleValue = this.generateSampleValue(field);
    return `${field.name}: ${sampleValue}`;
  }

  /**
   * Creates a realistic sample target tag based on field definition
   * @param field - Target schema field
   * @param sourceTag - Original source tag for context
   * @returns Sample tag in YAML format
   */
  private createSampleTargetTag(field: SchemaField, sourceTag: string): string {
    const sourceValue = this.extractValueFromSample(sourceTag);
    const transformedValue = this.transformValueForTarget(sourceValue, field);
    return `${field.name}: ${transformedValue}`;
  }

  /**
   * Generates realistic sample values based on field type
   * @param field - Schema field definition
   * @returns Sample value appropriate for the field type
   */
  private generateSampleValue(field: SchemaField): string {
    switch (field.type) {
      case 'string':
        if (field.name.includes('status')) return '"draft"';
        if (field.name.includes('type')) return '"blog-post"';
        if (field.name.includes('author')) return '"John Doe"';
        if (field.name.includes('title')) return '"Sample Document Title"';
        return '"sample-value"';
      
      case 'array':
        if (field.name.includes('tag')) return '["web", "development"]';
        if (field.name.includes('category')) return '["technology", "tutorial"]';
        return '["item1", "item2"]';
      
      case 'date':
        return '2024-01-15';
      
      case 'number':
        return '42';
      
      case 'boolean':
        return 'true';
      
      default:
        return '"sample-value"';
    }
  }

  /**
   * Extracts the value portion from a sample tag
   * @param sampleTag - Tag in format "key: value"
   * @returns The value portion
   */
  private extractValueFromSample(sampleTag: string): string {
    const colonIndex = sampleTag.indexOf(':');
    if (colonIndex === -1) return sampleTag;
    return sampleTag.substring(colonIndex + 1).trim();
  }

  /**
   * Transforms a source value to fit the target field requirements
   * @param sourceValue - Original value from source
   * @param targetField - Target field definition
   * @returns Transformed value appropriate for target field
   */
  private transformValueForTarget(sourceValue: string, targetField: SchemaField): string {
    // Remove quotes if present for processing
    const cleanValue = sourceValue.replace(/^"(.*)"$/, '$1');
    
    switch (targetField.type) {
      case 'string':
        // Apply field-specific transformations
        if (targetField.name.includes('state') && cleanValue === 'draft') {
          return '"provisional"';
        }
        if (targetField.name.includes('contentType') && cleanValue === 'blog-post') {
          return '"article"';
        }
        return `"${cleanValue}"`;
      
      case 'array':
        // Convert single values to arrays or transform array contents
        if (sourceValue.startsWith('[')) {
          return sourceValue; // Already an array
        }
        return `["${cleanValue}"]`;
      
      case 'date':
        // Handle date format transformations
        if (targetField.name.includes('publishedAt')) {
          return `${cleanValue}T00:00:00Z`;
        }
        return cleanValue;
      
      default:
        return sourceValue;
    }
  }
} 