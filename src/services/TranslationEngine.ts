import { CorrelationMapping } from '../shared/types/correlation';
import { Document } from '../shared/types/document';
import { YamlSchema, SchemaField, FieldType } from '../shared/types/schema';

export class TranslationEngine {
  private confidenceThreshold: number = 0.7; // Configurable confidence threshold

  /**
   * Sets the confidence threshold for direct field mapping
   * @param threshold - Minimum confidence for direct translation (0.0 - 1.0)
   */
  public setConfidenceThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Confidence threshold must be between 0.0 and 1.0');
    }
    this.confidenceThreshold = threshold;
  }

  /**
   * Translates the frontmatter of a document with confidence-based processing.
   * High-confidence mappings are translated directly, low-confidence preserved as fallback tags.
   * @param doc - The source document to translate.
   * @param mappings - The correlation mappings to apply.
   * @param targetSchema - The target schema to ensure compliance.
   * @returns A new document object with the translated frontmatter.
   */
  public translateDocument(doc: Document, mappings: CorrelationMapping[], targetSchema?: YamlSchema): Document {
    console.log(`🔄 Translating document: ${doc.filePath}`);
    console.log(`📋 Source frontmatter:`, doc.frontmatter);
    console.log(`🔗 Available mappings:`, mappings.map(m => `${m.sourceField.name} -> ${m.targetField.name} (${m.confidence})`));
    console.log(`⚡ Confidence threshold: ${this.confidenceThreshold}`);
    
    const translatedFrontmatter: Record<string, any> = {};
    const fallbackTags: string[] = [];

    // Process each field in the source document
    for (const key in doc.frontmatter) {
      const mapping = mappings.find(m => m.sourceField.name === key);

      if (mapping && mapping.confidence >= this.confidenceThreshold) {
        // High-confidence mapping: translate directly
        const targetKey = mapping.targetField.name;
        let translatedValue = doc.frontmatter[key];
        
        // Apply transformation if provided
        if (mapping.transform) {
          try {
            translatedValue = mapping.transform(doc.frontmatter[key]);
            console.log(`🔧 Transformed ${key}: ${doc.frontmatter[key]} -> ${translatedValue}`);
          } catch (error) {
            console.warn(`⚠️ Transformation failed for ${key}:`, error.message);
            translatedValue = doc.frontmatter[key];
          }
        }
        
        translatedFrontmatter[targetKey] = translatedValue;
        console.log(`✅ High-confidence mapping ${key} -> ${targetKey}: ${translatedValue} (confidence: ${mapping.confidence})`);
        
      } else if (mapping && mapping.confidence < this.confidenceThreshold) {
        // Low-confidence mapping: preserve as fallback tag
        const fallbackValue = this.formatFallbackTag(key, doc.frontmatter[key]);
        fallbackTags.push(fallbackValue);
        console.log(`⚠️ Low-confidence mapping for ${key}, added to fallback tags: ${fallbackValue} (confidence: ${mapping.confidence})`);
        
      } else {
        // No mapping found: try compatible field or add to fallback tags
        const compatibleTargetField = this.findCompatibleTargetField(key, doc.frontmatter[key], targetSchema);
        if (compatibleTargetField) {
          translatedFrontmatter[compatibleTargetField] = doc.frontmatter[key];
          console.log(`🔄 Compatible mapping ${key} -> ${compatibleTargetField}: ${doc.frontmatter[key]}`);
        } else {
          // Add to fallback tags to preserve data
          const fallbackValue = this.formatFallbackTag(key, doc.frontmatter[key]);
          fallbackTags.push(fallbackValue);
          console.log(`⏭️ No mapping found for ${key}, preserved as fallback tag: ${fallbackValue}`);
        }
      }
    }

    // Add fallback tags if any exist
    if (fallbackTags.length > 0) {
      this.addFallbackTags(translatedFrontmatter, fallbackTags);
    }

    // If target schema is provided, ensure all required fields are present
    if (targetSchema) {
      this.ensureRequiredFields(translatedFrontmatter, targetSchema);
    }

    console.log(`📋 Final translated frontmatter:`, translatedFrontmatter);

    return {
      ...doc,
      frontmatter: translatedFrontmatter,
    };
  }

  /**
   * Formats a source field and value as a fallback tag
   * @param key - Source field name
   * @param value - Source field value
   * @returns Formatted fallback tag string
   */
  private formatFallbackTag(key: string, value: any): string {
    if (typeof value === 'string') {
      return `${key}:${value}`;
    } else if (Array.isArray(value)) {
      return `${key}:${value.join(',')}`;
    } else if (typeof value === 'object' && value !== null) {
      return `${key}:${JSON.stringify(value)}`;
    } else {
      return `${key}:${String(value)}`;
    }
  }

  /**
   * Adds fallback tags to the translated frontmatter
   * @param frontmatter - The frontmatter object to modify
   * @param fallbackTags - Array of fallback tag strings
   */
  private addFallbackTags(frontmatter: Record<string, any>, fallbackTags: string[]): void {
    if (frontmatter.tags && Array.isArray(frontmatter.tags)) {
      // If tags field already exists, append fallback tags
      frontmatter.tags.push(...fallbackTags);
      console.log(`📎 Added ${fallbackTags.length} fallback tags to existing tags field`);
    } else if (frontmatter.tags) {
      // If tags field exists but isn't an array, convert to array and add fallback tags
      frontmatter.tags = [frontmatter.tags, ...fallbackTags];
      console.log(`📎 Converted tags field to array and added ${fallbackTags.length} fallback tags`);
    } else {
      // Create new tags field with fallback tags
      frontmatter.tags = fallbackTags;
      console.log(`📎 Created new tags field with ${fallbackTags.length} fallback tags`);
    }
  }

  /**
   * Finds a compatible target field for an unmapped source field.
   */
  private findCompatibleTargetField(sourceFieldName: string, sourceValue: any, targetSchema?: YamlSchema): string | null {
    if (!targetSchema) return null;

    // Look for exact name matches
    const exactMatch = targetSchema.fields.find(f => f.name.toLowerCase() === sourceFieldName.toLowerCase());
    if (exactMatch) return exactMatch.name;

    // Look for semantic matches based on common field names
    const semanticMappings: Record<string, string[]> = {
      'title': ['name', 'heading', 'subject'],
      'name': ['title', 'heading', 'subject'],
      'author': ['creator', 'by', 'writer'],
      'creator': ['author', 'by', 'writer'], 
      'date': ['created', 'published', 'timestamp'],
      'created': ['date', 'published', 'timestamp'],
      'published': ['date', 'created', 'timestamp'],
      'tags': ['categories', 'keywords', 'labels'],
      'categories': ['tags', 'keywords', 'labels'],
      'keywords': ['tags', 'categories', 'labels'],
      'description': ['summary', 'abstract', 'excerpt'],
      'summary': ['description', 'abstract', 'excerpt'],
      'status': ['state', 'stage', 'phase'],
      'state': ['status', 'stage', 'phase']
    };

    const possibleTargets = semanticMappings[sourceFieldName.toLowerCase()] || [];
    for (const target of possibleTargets) {
      const targetField = targetSchema.fields.find(f => f.name.toLowerCase() === target);
      if (targetField) return targetField.name;
    }

    return null;
  }

  /**
   * Ensures all required fields from the target schema are present with default values.
   */
  private ensureRequiredFields(frontmatter: Record<string, any>, targetSchema: YamlSchema): void {
    for (const field of targetSchema.fields) {
      if (field.required && !(field.name in frontmatter)) {
        const defaultValue = this.getDefaultValue(field);
        frontmatter[field.name] = defaultValue;
        console.log(`➕ Added required field ${field.name} with default value: ${defaultValue}`);
      }
    }
  }

  /**
   * Gets an appropriate default value for a schema field.
   */
  private getDefaultValue(field: SchemaField): any {
    switch (field.type) {
      case FieldType.STRING:
        return '';
      case FieldType.NUMBER:
        return 0;
      case FieldType.BOOLEAN:
        return false;
      case FieldType.DATE:
        return new Date().toISOString();
      case FieldType.ARRAY:
        return [];
      case FieldType.OBJECT:
        return {};
      default:
        return null;
    }
  }

  /**
   * Translates a batch of documents concurrently.
   * @param docs - An array of documents to translate.
   * @param mappings - The correlation mappings to apply to all documents.
   * @param targetSchema - The target schema to ensure compliance.
   * @returns A promise that resolves to an array of translated documents.
   */
  public async translateBatch(docs: Document[], mappings: CorrelationMapping[], targetSchema?: YamlSchema): Promise<Document[]> {
    const translationPromises = docs.map(doc => {
      return Promise.resolve(this.translateDocument(doc, mappings, targetSchema));
    });

    return Promise.all(translationPromises);
  }
} 