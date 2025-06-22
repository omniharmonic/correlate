import { Document } from '../shared/types/document';
import { DocumentEmbedding } from './EmbeddingService';

export interface SimilarDocument {
  document: Document;
  similarity: number;
  embedding: DocumentEmbedding;
}

export interface RelatedDocument {
  filePath: string;
  title: string;
  similarity: number;
  reason?: string;
}

export interface WikiLink {
  text: string;
  target: string;
}

export interface SimilarityConfig {
  threshold: number;
  maxResults: number;
  includeMetadataSimilarity: boolean;
  metadataWeight: number;
}

export class DocumentSimilarityEngine {
  private config: SimilarityConfig;
  private documentIndex: Map<string, DocumentEmbedding>;

  constructor(config: Partial<SimilarityConfig> = {}) {
    this.config = {
      threshold: 0.3,
      maxResults: 5,
      includeMetadataSimilarity: true,
      metadataWeight: 0.3,
      ...config
    };
    this.documentIndex = new Map();
  }

  /**
   * Indexes documents for similarity search
   * @param embeddings - Array of document embeddings to index
   */
  public indexDocuments(embeddings: DocumentEmbedding[]): void {
    console.log(`📚 Indexing ${embeddings.length} documents for similarity search`);
    
    this.documentIndex.clear();
    for (const embedding of embeddings) {
      this.documentIndex.set(embedding.documentPath, embedding);
    }
    
    console.log(`✅ Indexed ${this.documentIndex.size} documents`);
  }

  /**
   * Finds documents similar to the given document
   * @param queryDocument - Document to find similarities for
   * @param queryEmbedding - Embedding of the query document
   * @returns Array of similar documents sorted by similarity score
   */
  public async findRelatedDocuments(
    queryDocument: Document, 
    queryEmbedding: DocumentEmbedding
  ): Promise<RelatedDocument[]> {
    console.log(`🔍 Finding documents related to: ${queryDocument.filePath}`);
    
    const similarities: SimilarDocument[] = [];

    for (const [filePath, embedding] of this.documentIndex) {
      // Skip self-comparison
      if (filePath === queryDocument.filePath) continue;

      try {
        // Calculate content similarity using cosine similarity
        const contentSimilarity = this.calculateCosineSimilarity(
          queryEmbedding.embedding,
          embedding.embedding
        );

        // Calculate metadata similarity if enabled
        let metadataSimilarity = 0;
        if (this.config.includeMetadataSimilarity) {
          metadataSimilarity = this.calculateMetadataSimilarity(
            queryEmbedding.metadata,
            embedding.metadata
          );
        }

        // Combine similarities with weighting
        const combinedSimilarity = this.config.includeMetadataSimilarity
          ? (contentSimilarity * (1 - this.config.metadataWeight)) + 
            (metadataSimilarity * this.config.metadataWeight)
          : contentSimilarity;

        // Only include documents above threshold
        if (combinedSimilarity >= this.config.threshold) {
          const mockDocument: Document = {
            filePath: embedding.documentPath,
            content: embedding.content,
            frontmatter: embedding.metadata
          };

          similarities.push({
            document: mockDocument,
            similarity: combinedSimilarity,
            embedding
          });
        }

      } catch (error) {
        console.warn(`⚠️ Error calculating similarity for ${filePath}:`, error);
      }
    }

    // Sort by similarity (highest first) and limit results
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topSimilarities = similarities.slice(0, this.config.maxResults);

    console.log(`📊 Found ${topSimilarities.length} related documents (threshold: ${this.config.threshold})`);

    // Convert to RelatedDocument format
    return topSimilarities.map(sim => ({
      filePath: sim.document.filePath,
      title: this.extractDocumentTitle(sim.document),
      similarity: sim.similarity,
      reason: this.generateSimilarityReason(sim.similarity, queryDocument, sim.document)
    }));
  }

  /**
   * Generates wiki-links for related documents
   * @param relatedDocs - Array of related documents
   * @returns Array of wiki-link objects
   */
  public generateWikiLinks(relatedDocs: RelatedDocument[]): WikiLink[] {
    return relatedDocs.map(doc => ({
      text: doc.title,
      target: this.formatWikiLinkTarget(doc.filePath)
    }));
  }

  /**
   * Adds "Related" field to document frontmatter with wiki-links
   * @param document - Document to enhance
   * @param relatedDocs - Array of related documents
   * @returns Enhanced document with Related field
   */
  public addRelatedLinksToDocument(document: Document, relatedDocs: RelatedDocument[]): Document {
    const wikiLinks = this.generateWikiLinks(relatedDocs);
    const relatedLinks = wikiLinks.map(link => `[[${link.target}|${link.text}]]`);

    const enhancedFrontmatter = { ...document.frontmatter };

    if (enhancedFrontmatter.Related || enhancedFrontmatter.related) {
      // If Related field already exists, merge the links
      const existingField = enhancedFrontmatter.Related || enhancedFrontmatter.related;
      const existingRelated = Array.isArray(existingField) 
        ? existingField 
        : [existingField];
      
      enhancedFrontmatter.Related = [...existingRelated, ...relatedLinks];
      // Remove lowercase version if it exists
      delete enhancedFrontmatter.related;
      console.log(`🔗 Added ${relatedLinks.length} links to existing Related field`);
    } else {
      // Create new Related field (uppercase for consistency with schema standards)
      enhancedFrontmatter.Related = relatedLinks;
      console.log(`🔗 Created Related field with ${relatedLinks.length} links`);
    }

    return {
      ...document,
      frontmatter: enhancedFrontmatter
    };
  }

  /**
   * Calculates cosine similarity between two vectors
   * @param vecA - First vector
   * @param vecB - Second vector
   * @returns Cosine similarity score (0-1)
   */
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length for cosine similarity');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Calculates similarity between document metadata
   * @param metadataA - First document metadata
   * @param metadataB - Second document metadata
   * @returns Metadata similarity score (0-1)
   */
  private calculateMetadataSimilarity(
    metadataA: Record<string, any>,
    metadataB: Record<string, any>
  ): number {
    const keysA = new Set(Object.keys(metadataA));
    const keysB = new Set(Object.keys(metadataB));
    
    // Calculate Jaccard similarity for field names
    const intersection = new Set([...keysA].filter(key => keysB.has(key)));
    const union = new Set([...keysA, ...keysB]);
    
    if (union.size === 0) return 0;
    
    const fieldSimilarity = intersection.size / union.size;

    // Calculate value similarity for common fields
    let valueSimilarity = 0;
    let commonFields = 0;

    for (const key of intersection) {
      const valueA = metadataA[key];
      const valueB = metadataB[key];
      
      if (this.compareValues(valueA, valueB)) {
        valueSimilarity += 1;
      }
      commonFields += 1;
    }

    const averageValueSimilarity = commonFields > 0 ? valueSimilarity / commonFields : 0;
    
    // Combine field and value similarities
    return (fieldSimilarity + averageValueSimilarity) / 2;
  }

  /**
   * Compares two metadata values for similarity
   * @param valueA - First value
   * @param valueB - Second value
   * @returns True if values are similar
   */
  private compareValues(valueA: any, valueB: any): boolean {
    // Exact match
    if (valueA === valueB) return true;

    // String comparison (case-insensitive)
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return valueA.toLowerCase() === valueB.toLowerCase();
    }

    // Array comparison (intersection-based)
    if (Array.isArray(valueA) && Array.isArray(valueB)) {
      const setA = new Set(valueA.map(v => String(v).toLowerCase()));
      const setB = new Set(valueB.map(v => String(v).toLowerCase()));
      const intersection = new Set([...setA].filter(x => setB.has(x)));
      return intersection.size > 0; // Any common elements
    }

    return false;
  }

  /**
   * Extracts document title from frontmatter or filename
   * @param document - Document to extract title from
   * @returns Document title
   */
  private extractDocumentTitle(document: Document): string {
    // Try various title fields in frontmatter
    const titleFields = ['title', 'name', 'heading', 'subject'];
    
    for (const field of titleFields) {
      if (document.frontmatter[field] && typeof document.frontmatter[field] === 'string') {
        return document.frontmatter[field];
      }
    }

    // Fallback to filename without extension
    const filename = document.filePath.split('/').pop() || document.filePath;
    return filename.replace(/\.[^/.]+$/, ''); // Remove extension
  }

  /**
   * Formats file path for wiki-link target
   * @param filePath - Original file path
   * @returns Formatted wiki-link target
   */
  private formatWikiLinkTarget(filePath: string): string {
    // Remove file extension and normalize path
    const target = filePath
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/^.*\//, ''); // Keep only filename part
    
    return target;
  }

  /**
   * Generates a human-readable reason for the similarity
   * @param similarity - Similarity score
   * @param queryDoc - Query document
   * @param relatedDoc - Related document
   * @returns Similarity reason string
   */
  private generateSimilarityReason(
    similarity: number,
    queryDoc: Document,
    relatedDoc: Document
  ): string {
    if (similarity >= 0.8) {
      return 'Very similar content and metadata';
    } else if (similarity >= 0.6) {
      return 'Similar topics and structure';
    } else if (similarity >= 0.4) {
      return 'Related themes or concepts';
    } else {
      return 'Some shared elements';
    }
  }

  /**
   * Updates similarity configuration
   * @param newConfig - New configuration settings
   */
  public updateConfig(newConfig: Partial<SimilarityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Updated similarity configuration:', this.config);
  }

  /**
   * Gets current similarity configuration
   * @returns Current configuration
   */
  public getConfig(): SimilarityConfig {
    return { ...this.config };
  }

  /**
   * Gets statistics about the document index
   * @returns Index statistics
   */
  public getIndexStats(): { totalDocuments: number; documentPaths: string[] } {
    return {
      totalDocuments: this.documentIndex.size,
      documentPaths: Array.from(this.documentIndex.keys())
    };
  }
} 