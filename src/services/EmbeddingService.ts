import { Document } from '../shared/types/document';
import { DocumentEmbedding } from '../shared/types/api';
import { EmbeddingCacheManager } from './EmbeddingCacheManager';

export interface EmbeddingConfig {
  model: 'transformers' | 'ollama';
  maxTokens?: number;
  batchSize?: number;
  cacheEnabled?: boolean;
}

export class EmbeddingService {
  private config: EmbeddingConfig;
  private embeddingCache: Map<string, DocumentEmbedding>;
  private cacheManager: EmbeddingCacheManager;

  constructor(config: EmbeddingConfig = { model: 'ollama' }) {
    this.config = {
      maxTokens: 512,
      batchSize: 10,
      cacheEnabled: true,
      ...config
    };
    this.embeddingCache = new Map();
    this.cacheManager = new EmbeddingCacheManager();
  }

  /**
   * Generates embeddings for a batch of documents
   * @param documents - Array of documents to process
   * @param directoryPath - Path to the directory being processed (for caching)
   * @returns Promise resolving to array of document embeddings
   */
  public async generateEmbeddings(documents: Document[], directoryPath?: string): Promise<DocumentEmbedding[]> {
    console.log(`🔍 Generating embeddings for ${documents.length} documents using ${this.config.model}`);
    
    // Try to load from persistent cache first
    if (directoryPath && this.config.cacheEnabled) {
      const cachedEmbeddings = await this.cacheManager.loadEmbeddings(directoryPath);
      if (cachedEmbeddings && cachedEmbeddings.length > 0) {
        console.log(`📚 Loaded ${cachedEmbeddings.length} embeddings from persistent cache`);
        return cachedEmbeddings;
      }
    }
    
    const results: DocumentEmbedding[] = [];
    const batchSize = this.config.batchSize || 10;

    // Process documents in batches for better performance
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}`);
      
      const batchResults = await this.processBatch(batch);
      results.push(...batchResults);
      
      // Small delay between batches to avoid overwhelming the embedding service
      if (i + batchSize < documents.length) {
        await this.delay(100);
      }
    }

    // Save to persistent cache if directory path provided
    if (directoryPath && this.config.cacheEnabled && results.length > 0) {
      await this.cacheManager.saveEmbeddings(results, directoryPath, this.config.model);
    }

    console.log(`✅ Generated embeddings for ${results.length} documents`);
    return results;
  }

  /**
   * Processes a batch of documents for embedding generation
   * @param documents - Batch of documents to process
   * @returns Promise resolving to array of document embeddings
   */
  private async processBatch(documents: Document[]): Promise<DocumentEmbedding[]> {
    const embeddings: DocumentEmbedding[] = [];

    for (const doc of documents) {
      try {
        // Check cache first if enabled
        if (this.config.cacheEnabled) {
          const cached = this.getCachedEmbedding(doc);
          if (cached) {
            embeddings.push(cached);
            continue;
          }
        }

        // Generate embedding for document
        const embedding = await this.generateSingleEmbedding(doc);
        embeddings.push(embedding);

        // Cache the result if enabled
        if (this.config.cacheEnabled) {
          this.cacheEmbedding(embedding);
        }

      } catch (error) {
        console.error(`❌ Failed to generate embedding for ${doc.filePath}:`, error);
        // Continue with other documents even if one fails
      }
    }

    return embeddings;
  }

  /**
   * Generates embedding for a single document
   * @param document - Document to process
   * @returns Promise resolving to document embedding
   */
  private async generateSingleEmbedding(document: Document): Promise<DocumentEmbedding> {
    const text = this.prepareTextForEmbedding(document);
    const embedding = await this.callEmbeddingAPI(text);

    return {
      documentPath: document.filePath,
      content: text,
      embedding,
      metadata: document.frontmatter,
      createdAt: new Date()
    };
  }

  /**
   * Prepares document text for embedding generation
   * @param document - Document to prepare
   * @returns Processed text string
   */
  private prepareTextForEmbedding(document: Document): string {
    // Combine frontmatter and content for comprehensive embedding
    const metadataText = Object.entries(document.frontmatter)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(' ');
    
    const contentText = document.content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Extract link text
      .replace(/[#*_`]/g, '') // Remove markdown formatting
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    const combinedText = `${metadataText} ${contentText}`;
    
    // Truncate if exceeds max tokens (approximate)
    const maxLength = (this.config.maxTokens || 512) * 4; // Rough token-to-char ratio
    return combinedText.length > maxLength 
      ? combinedText.substring(0, maxLength) + '...'
      : combinedText;
  }

  /**
   * Calls the appropriate embedding API based on configuration
   * @param text - Text to generate embedding for
   * @returns Promise resolving to embedding vector
   */
  private async callEmbeddingAPI(text: string): Promise<number[]> {
    switch (this.config.model) {
      case 'ollama':
        return this.callOllamaEmbedding(text);
      case 'transformers':
        return this.callTransformersEmbedding(text);
      default:
        throw new Error(`Unsupported embedding model: ${this.config.model}`);
    }
  }

  /**
   * Generates embedding using Ollama API
   * @param text - Text to embed
   * @returns Promise resolving to embedding vector
   */
  private async callOllamaEmbedding(text: string): Promise<number[]> {
    try {
      // Note: This assumes Ollama is running locally with embeddings support
      const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'nomic-embed-text', // Default embedding model
          prompt: text
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding;

    } catch (error) {
      console.error('Ollama embedding API error:', error);
      throw new Error(`Failed to generate Ollama embedding: ${error.message}`);
    }
  }

  /**
   * Generates embedding using transformers.js (local)
   * @param text - Text to embed
   * @returns Promise resolving to embedding vector
   */
  private async callTransformersEmbedding(text: string): Promise<number[]> {
    try {
      // Note: This would require @xenova/transformers dependency
      // Placeholder implementation - would need actual transformers.js integration
      throw new Error('Transformers.js embedding not yet implemented. Use Ollama model instead.');
      
      // Example implementation:
      // const { pipeline } = await import('@xenova/transformers');
      // const extractor = await pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2');
      // const output = await extractor(text, { pooling: 'mean', normalize: true });
      // return Array.from(output.data);

    } catch (error) {
      console.error('Transformers embedding error:', error);
      throw new Error(`Failed to generate transformers embedding: ${error.message}`);
    }
  }

  /**
   * Retrieves cached embedding for a document
   * @param document - Document to check cache for
   * @returns Cached embedding or null
   */
  private getCachedEmbedding(document: Document): DocumentEmbedding | null {
    const cacheKey = this.generateCacheKey(document);
    return this.embeddingCache.get(cacheKey) || null;
  }

  /**
   * Caches a document embedding
   * @param embedding - Embedding to cache
   */
  private cacheEmbedding(embedding: DocumentEmbedding): void {
    const cacheKey = this.generateCacheKey({ filePath: embedding.documentPath } as Document);
    this.embeddingCache.set(cacheKey, embedding);
  }

  /**
   * Generates cache key for a document
   * @param document - Document to generate key for
   * @returns Cache key string
   */
  private generateCacheKey(document: Document): string {
    return `embedding:${document.filePath}`;
  }

  /**
   * Export embeddings to a shareable file
   * @param exportPath - Path where to save the export file
   * @param libraryPath - Optional specific library to export (exports all if not provided)
   */
  public async exportEmbeddings(exportPath: string, libraryPath?: string): Promise<void> {
    return this.cacheManager.exportEmbeddings(exportPath, libraryPath);
  }

  /**
   * Import embeddings from a shared file
   * @param importPath - Path to the import file
   * @returns Array of imported embeddings
   */
  public async importEmbeddings(importPath: string): Promise<DocumentEmbedding[]> {
    return this.cacheManager.importEmbeddings(importPath);
  }

  /**
   * Get persistent cache statistics
   * @returns Persistent cache statistics object
   */
  public async getPersistentCacheStats() {
    return this.cacheManager.getCacheStats();
  }

  /**
   * Clear all persistent caches
   */
  public async clearPersistentCache(): Promise<void> {
    return this.cacheManager.clearCache();
  }

  /**
   * Utility method to add delay between operations
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clears the in-memory embedding cache
   */
  public clearCache(): void {
    this.embeddingCache.clear();
    console.log('🗑️ In-memory embedding cache cleared');
  }

  /**
   * Gets in-memory cache statistics
   * @returns In-memory cache statistics object
   */
  public getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.embeddingCache.size,
      entries: Array.from(this.embeddingCache.keys())
    };
  }
} 