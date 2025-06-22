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
    let refinedMappings = [...mappings];

    for (const item of feedback) {
      const { originalMapping, type, correctedMapping } = item;
      const index = refinedMappings.findIndex(
        m => m.sourceField.name === originalMapping.sourceField.name
      );

      if (index === -1) {
        // The mapping to be refined does not exist, so we skip it.
        console.warn('Original mapping for feedback not found:', originalMapping);
        continue;
      }

      switch (type) {
        case FeedbackType.APPROVE:
          refinedMappings[index].confidence = 1.0;
          break;
        case FeedbackType.REJECT:
          refinedMappings.splice(index, 1);
          break;
        case FeedbackType.EDIT:
          if (correctedMapping) {
            refinedMappings[index] = {
              ...correctedMapping,
              confidence: 1.0, // Mark as high confidence since it's a manual edit.
            };
          }
          break;
      }
    }
    return refinedMappings;
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