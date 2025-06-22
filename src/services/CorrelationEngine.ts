import { YamlSchema } from '../shared/types/schema';
import { CorrelationMapping, CorrelationResult } from '../shared/types/correlation';
import { LLMOrchestrator } from './LLMOrchestrator';
import { UserFeedback, FeedbackType } from '../shared/types/feedback';

export class CorrelationEngine {
  private llmOrchestrator: LLMOrchestrator;
  private correlationCache: Map<string, CorrelationResult>;

  constructor() {
    this.llmOrchestrator = new LLMOrchestrator();
    this.correlationCache = new Map<string, CorrelationResult>();
  }

  /**
   * Generates a cache key from the source and target schemas.
   * @param source - The source YamlSchema.
   * @param target - The target YamlSchema.
   * @returns A unique string key.
   */
  private generateCacheKey(source: YamlSchema, target: YamlSchema): string {
    return `${source.name}@${source.version}|${target.name}@${target.version}`;
  }

  /**
   * Generates an initial correlation mapping between a source and target schema using the LLM.
   * @param source - The source YamlSchema.
   * @param target - The target YamlSchema.
   * @returns A promise that resolves to the generated correlation result.
   */
  public async generateCorrelation(source: YamlSchema, target: YamlSchema): Promise<CorrelationResult> {
    const cacheKey = this.generateCacheKey(source, target);
    if (this.correlationCache.has(cacheKey)) {
      console.log(`Cache hit for key: ${cacheKey}`);
      return this.correlationCache.get(cacheKey);
    }

    console.log(`Cache miss for key: ${cacheKey}. Calling LLM.`);
    const prompt = {
      sourceSchema: source,
      targetSchema: target,
    };

    try {
      const result = await this.llmOrchestrator.processCorrelation(prompt);
      this.correlationCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error generating correlation in CorrelationEngine:', error);
      throw new Error('Failed to generate correlation.');
    }
  }

  /**
   * Refines an existing correlation mapping based on user feedback.
   * @param mappings - The initial correlation mappings.
   * @param feedback - The user feedback used for refinement.
   * @returns The refined correlation mapping.
   */
  public refineCorrelation(mappings: CorrelationMapping[], feedback: UserFeedback[]): CorrelationMapping[] {
    console.log(`🔧 Refining correlation based on ${feedback.length} feedback items`);
    
    const refinedMappings = mappings.map(mapping => {
      const relevantFeedback = feedback.find(fb => 
        fb.originalMapping.sourceField.name === mapping.sourceField.name &&
        fb.originalMapping.targetField.name === mapping.targetField.name
      );

      if (!relevantFeedback) {
        return mapping; // No feedback, keep original
      }

      switch (relevantFeedback.type) {
        case FeedbackType.APPROVE:
          // Increase confidence for approved mappings
          console.log(`✅ Approved mapping: ${mapping.sourceField.name} -> ${mapping.targetField.name}`);
          return {
            ...mapping,
            confidence: Math.min(1.0, mapping.confidence + 0.2)
          };
          
        case FeedbackType.REJECT:
          // Decrease confidence for rejected mappings
          console.log(`❌ Rejected mapping: ${mapping.sourceField.name} -> ${mapping.targetField.name}`);
          return {
            ...mapping,
            confidence: Math.max(0.0, mapping.confidence - 0.5)
          };
          
        case FeedbackType.EDIT:
          // Use corrected mapping if provided
          if (relevantFeedback.correctedMapping) {
            console.log(`✏️ Edited mapping: ${mapping.sourceField.name} -> ${relevantFeedback.correctedMapping.targetField.name}`);
            return {
              ...relevantFeedback.correctedMapping,
              confidence: 0.9 // High confidence for user-corrected mappings
            };
          }
          return mapping;
          
        default:
          return mapping;
      }
    });
    
    // Filter out very low confidence mappings (< 0.3)
    const filteredMappings = refinedMappings.filter(mapping => mapping.confidence >= 0.3);
    
    console.log(`🎯 Refined ${mappings.length} mappings to ${filteredMappings.length} (removed ${mappings.length - filteredMappings.length} low-confidence mappings)`);
    
    return filteredMappings;
  }

  /**
   * Caches a correlation result to avoid redundant LLM calls.
   * @param key - A unique key representing the schema pair.
   * @param result - The correlation result to cache.
   */
  private cacheCorrelation(key: string, result: CorrelationResult): void {
    console.log(`Caching result for key: ${key}`);
    this.correlationCache.set(key, result);
  }
} 