import { CorrelationResult } from './correlation';
import { YamlSchema } from './schema';
import { TranslationSample } from './translation';
import { Document } from './document';

export interface DocumentEmbedding {
  documentPath: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface RelatedDocument {
  filePath: string;
  title: string;
  similarity: number;
  reason?: string;
}

export interface VectorStoreStats {
  totalDocuments: number;
  documentPaths: string[];
  lastIndexed: Date;
}

export interface SimilarityConfig {
  threshold: number;
  maxResults: number;
  includeMetadataSimilarity: boolean;
  metadataWeight: number;
}

export interface CorrelateAPI {
  correlateSchemas: (source: YamlSchema, target: YamlSchema) => Promise<CorrelationResult>;
  selectDirectory: () => Promise<string | null>;
  getSchemas: (sourcePath: string, targetPath: string) => Promise<{ sourceSchema: YamlSchema, targetSchema: YamlSchema }>;
  processDocuments: (sourcePath: string, targetPath: string, approvedTranslations: TranslationSample[]) => Promise<{ processedCount: number, outputPath: string }>;
  generateEmbeddings: (directoryPath: string) => Promise<DocumentEmbedding[]>;
  indexDocuments: (embeddings: DocumentEmbedding[]) => Promise<VectorStoreStats>;
  findRelatedDocuments: (documentPath: string, config?: Partial<SimilarityConfig>) => Promise<RelatedDocument[]>;
  addWikiLinksToDocument: (documentPath: string, relatedDocs: RelatedDocument[]) => Promise<Document>;
  getVectorStoreStats: () => Promise<VectorStoreStats>;
  clearVectorStore: () => Promise<void>;
  exportEmbeddings: (libraryPath?: string) => Promise<{ exportPath: string }>;
  importEmbeddings: () => Promise<{ importedCount: number; embeddings: DocumentEmbedding[] }>;
  getCacheStats: () => Promise<{ totalCaches: number; totalEmbeddings: number; totalStorageSize: number; oldestCache: string | null; newestCache: string | null; cacheEntries: any[] }>;
} 