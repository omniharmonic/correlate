import { create } from 'zustand';
import { YamlSchema } from '@/shared/types/schema';
import { TranslationSample } from '@/shared/types/translation';
import { DocumentEmbedding, RelatedDocument, VectorStoreStats, SimilarityConfig } from '@/shared/types/api';

// Enhanced types for batch operations and history
interface DocumentWithRelated {
  documentPath: string;
  relatedDocuments: RelatedDocument[];
  isApproved: boolean;
}

interface EmbeddingHistory {
  timestamp: string;
  directoryPath: string;
  documentCount: number;
  embeddingCount: number;
}

// Type assertion for correlateAPI until TypeScript properly resolves it
declare global {
  interface Window {
    correlateAPI: {
      correlateSchemas: (source: YamlSchema, target: YamlSchema) => Promise<any>;
      selectDirectory: () => Promise<string | null>;
      getSchemas: (sourcePath: string, targetPath: string) => Promise<{ sourceSchema: YamlSchema, targetSchema: YamlSchema }>;
      processDocuments: (sourcePath: string, targetPath: string, translations: TranslationSample[]) => Promise<{ processedCount: number; outputPath: string }>;
      generateEmbeddings: (directoryPath: string) => Promise<DocumentEmbedding[]>;
      indexDocuments: (embeddings: DocumentEmbedding[]) => Promise<VectorStoreStats>;
      findRelatedDocuments: (documentPath: string, config?: Partial<SimilarityConfig>) => Promise<RelatedDocument[]>;
      addWikiLinksToDocument: (documentPath: string, relatedDocs: RelatedDocument[]) => Promise<any>;
      getVectorStoreStats: () => Promise<VectorStoreStats>;
      clearVectorStore: () => Promise<void>;
      exportEmbeddings: (libraryPath?: string) => Promise<{ exportPath: string }>;
      importEmbeddings: () => Promise<{ importedCount: number; embeddings: DocumentEmbedding[] }>;
      getCacheStats: () => Promise<any>;
    };
  }
}

interface AppState {
  sourcePath: string | null;
  targetPath: string | null;
  sourceSchema: YamlSchema | null;
  targetSchema: YamlSchema | null;
  sampleTranslations: TranslationSample[];
  approvedTranslations: TranslationSample[];
  rejectedTranslations: TranslationSample[];
  isLoading: boolean;
  error: string | null;
  correlationCompleted: boolean;
  readyForProcessing: boolean;
  activeTab: 'correlation' | 'vector-store';
  vectorStorePath: string | null;
  embeddings: DocumentEmbedding[];
  vectorStoreStats: VectorStoreStats | null;
  selectedDocument: string | null;
  relatedDocuments: RelatedDocument[];
  similarityConfig: SimilarityConfig;
  
  // New batch operations state
  selectedDocuments: string[];
  documentsWithRelated: DocumentWithRelated[];
  batchMode: boolean;
  
  // New embedding history state
  embeddingHistory: EmbeddingHistory[];
  lastEmbeddingGeneration: string | null;
  
  setSourcePath: (path: string | null) => void;
  setTargetPath: (path:string | null) => void;
  fetchSchemas: () => Promise<void>;
  runCorrelation: () => Promise<void>;
  approveSample: (sample: TranslationSample) => void;
  rejectSample: (sample: TranslationSample) => void;
  editSample: (sample: TranslationSample, newValue: string) => void;
  processDocuments: () => Promise<void>;
  resetWorkflow: () => void;
  setActiveTab: (tab: 'correlation' | 'vector-store') => void;
  setVectorStorePath: (path: string | null) => void;
  generateEmbeddings: () => Promise<void>;
  indexDocuments: () => Promise<void>;
  findRelatedDocuments: (documentPath: string) => Promise<void>;
  addWikiLinksToDocument: (documentPath: string) => Promise<void>;
  updateSimilarityConfig: (config: Partial<SimilarityConfig>) => void;
  clearVectorStore: () => Promise<void>;
  resetVectorStore: () => void;
  
  // New batch operations functions
  toggleDocumentSelection: (documentPath: string) => void;
  selectAllDocuments: () => void;
  clearDocumentSelection: () => void;
  setBatchMode: (enabled: boolean) => void;
  findRelatedDocumentsBatch: (documentPaths: string[]) => Promise<void>;
  removeRelatedDocument: (documentPath: string, relatedDocPath: string) => void;
  approveDocumentRelations: (documentPath: string) => void;
  processBatchWikiLinks: () => Promise<void>;
  
  // New embedding history functions
  addEmbeddingHistory: (directoryPath: string, documentCount: number, embeddingCount: number) => void;
  getEmbeddingHistoryForPath: (directoryPath: string) => EmbeddingHistory | null;
  
  // Analytics and sharing functions
  exportEmbeddings: (libraryPath?: string) => Promise<void>;
  importEmbeddings: () => Promise<void>;
  getCacheStats: () => Promise<any>;
}

export const useAppStore = create<AppState>((set, get) => ({
  sourcePath: null,
  targetPath: null,
  sourceSchema: null,
  targetSchema: null,
  sampleTranslations: [],
  approvedTranslations: [],
  rejectedTranslations: [],
  isLoading: false,
  error: null,
  correlationCompleted: false,
  readyForProcessing: false,
  activeTab: 'correlation',
  vectorStorePath: null,
  embeddings: [],
  vectorStoreStats: null,
  selectedDocument: null,
  relatedDocuments: [],
  similarityConfig: {
    threshold: 0.3,
    maxResults: 50,
    includeMetadataSimilarity: true,
    metadataWeight: 0.3
  },
  
  // New batch operations state
  selectedDocuments: [],
  documentsWithRelated: [],
  batchMode: false,
  
  // New embedding history state
  embeddingHistory: [],
  lastEmbeddingGeneration: null,
  
  setSourcePath: (path) => set({ sourcePath: path }),
  setTargetPath: (path) => set({ targetPath: path }),
  fetchSchemas: async () => {
    const { sourcePath, targetPath } = get();
    if (!sourcePath || !targetPath) return;

    set({ isLoading: true, error: null });
    try {
      if (!window.correlateAPI) {
        throw new Error('Correlate API not available');
      }
      const { sourceSchema, targetSchema } = await window.correlateAPI.getSchemas(sourcePath, targetPath);
      set({ sourceSchema, targetSchema, isLoading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to fetch schemas', isLoading: false });
    }
  },
  runCorrelation: async () => {
    const { sourceSchema, targetSchema } = get();
    if (!sourceSchema || !targetSchema) return;

    set({ isLoading: true, error: null });
    try {
      if (!window.correlateAPI) {
        throw new Error('Correlate API not available');
      }
      const correlationResult = await window.correlateAPI.correlateSchemas(sourceSchema, targetSchema);
      
      // Import and use TranslationSampleGenerator (dynamic import to avoid circular dependencies)
      const { TranslationSampleGenerator } = await import('../services/TranslationSampleGenerator');
      const sampleGenerator = new TranslationSampleGenerator();
      
      // Convert correlation result to reviewable samples
      const samples = sampleGenerator.convertCorrelationToSamples(
        correlationResult,
        sourceSchema,
        targetSchema
      );

      set({ 
        sampleTranslations: samples, 
        isLoading: false, 
        correlationCompleted: true,
        approvedTranslations: [],
        rejectedTranslations: []
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Correlation failed', isLoading: false });
    }
  },
  approveSample: (sample) => {
    const { approvedTranslations, rejectedTranslations } = get();
    
    // Check if this sample is already approved (prevent duplicates)
    const isAlreadyApproved = approvedTranslations.some(approved => approved.sourceTag === sample.sourceTag);
    if (isAlreadyApproved) {
      return; // Don't add duplicates
    }
    
    // Remove from rejected list if it was previously rejected
    const newRejected = rejectedTranslations.filter(rejected => rejected.sourceTag !== sample.sourceTag);
    const newApproved = [...approvedTranslations, sample];
    
    // Always ready for processing if we have any approved translations
    const readyForProcessing = newApproved.length > 0;
    
    set({ 
      approvedTranslations: newApproved,
      rejectedTranslations: newRejected,
      readyForProcessing
    });
  },
  rejectSample: (sample) => {
    const { rejectedTranslations, approvedTranslations } = get();
    
    // Check if this sample is already rejected (prevent duplicates)
    const isAlreadyRejected = rejectedTranslations.some(rejected => rejected.sourceTag === sample.sourceTag);
    if (isAlreadyRejected) {
      return; // Don't add duplicates
    }
    
    // Remove from approved list if it was previously approved
    const newApproved = approvedTranslations.filter(approved => approved.sourceTag !== sample.sourceTag);
    const newRejected = [...rejectedTranslations, sample];
    
    // Ready for processing if we still have any approved translations
    const readyForProcessing = newApproved.length > 0;
    
    set({ 
      rejectedTranslations: newRejected,
      approvedTranslations: newApproved,
      readyForProcessing
    });
  },
  editSample: (sample, newValue) => {
    const { sampleTranslations } = get();
    const updatedSamples = sampleTranslations.map(s => 
      s.sourceTag === sample.sourceTag 
        ? { ...s, translatedTag: newValue }
        : s
    );
    set({ sampleTranslations: updatedSamples });
  },
  processDocuments: async () => {
    const { sourcePath, targetPath, approvedTranslations } = get();
    if (!sourcePath || !targetPath || approvedTranslations.length === 0) return;

    set({ isLoading: true, error: null });
    try {
      if (!window.correlateAPI) {
        throw new Error('Correlate API not available');
      }
      
      const result = await window.correlateAPI.processDocuments(sourcePath, targetPath, approvedTranslations);
      
      set({ 
        isLoading: false,
        error: null 
      });
      
      alert(`Document processing completed! ${result.processedCount} documents processed.\n\nOutput saved to: ${result.outputPath}`);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Document processing failed', isLoading: false });
    }
  },
  resetWorkflow: () => {
    set({
      sourcePath: null,
      targetPath: null,
      sourceSchema: null,
      targetSchema: null,
      sampleTranslations: [],
      approvedTranslations: [],
      rejectedTranslations: [],
      correlationCompleted: false,
      readyForProcessing: false,
      isLoading: false,
      error: null
    });
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setVectorStorePath: (path) => set({ vectorStorePath: path }),
  generateEmbeddings: async () => {
    const { vectorStorePath, addEmbeddingHistory } = get();
    if (!vectorStorePath) return;

    set({ isLoading: true, error: null });
    try {
      if (!window.correlateAPI) {
        throw new Error('Correlate API not available');
      }
      
      const embeddings = await window.correlateAPI.generateEmbeddings(vectorStorePath);
      const timestamp = new Date().toISOString();
      
      // Add to history
      addEmbeddingHistory(vectorStorePath, embeddings.length, embeddings.length);
      
      set({ 
        embeddings, 
        isLoading: false,
        lastEmbeddingGeneration: timestamp
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Embedding generation failed', isLoading: false });
    }
  },
  indexDocuments: async () => {
    const { embeddings } = get();
    if (embeddings.length === 0) return;

    set({ isLoading: true, error: null });
    try {
      if (!window.correlateAPI) {
        throw new Error('Correlate API not available');
      }
      
      const stats = await window.correlateAPI.indexDocuments(embeddings);
      set({ vectorStoreStats: stats, isLoading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Document indexing failed', isLoading: false });
    }
  },
  findRelatedDocuments: async (documentPath) => {
    const { similarityConfig } = get();
    
    set({ isLoading: true, error: null, selectedDocument: documentPath });
    try {
      if (!window.correlateAPI) {
        throw new Error('Correlate API not available');
      }
      
      const relatedDocs = await window.correlateAPI.findRelatedDocuments(documentPath, similarityConfig);
      set({ relatedDocuments: relatedDocs, isLoading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Related document search failed', isLoading: false });
    }
  },
  addWikiLinksToDocument: async (documentPath) => {
    const { relatedDocuments } = get();
    
    set({ isLoading: true, error: null });
    try {
      if (!window.correlateAPI) {
        throw new Error('Correlate API not available');
      }
      
      await window.correlateAPI.addWikiLinksToDocument(documentPath, relatedDocuments);
      set({ isLoading: false });
      
      // Show success message
      alert(`Wiki links successfully added to ${documentPath}!`);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Wiki link addition failed', isLoading: false });
    }
  },
  updateSimilarityConfig: (config) => {
    const { similarityConfig } = get();
    set({ similarityConfig: { ...similarityConfig, ...config } });
  },
  clearVectorStore: async () => {
    set({ isLoading: true, error: null });
    try {
      if (!window.correlateAPI) {
        throw new Error('Correlate API not available');
      }
      
      await window.correlateAPI.clearVectorStore();
      set({ 
        embeddings: [],
        vectorStoreStats: null,
        selectedDocument: null,
        relatedDocuments: [],
        selectedDocuments: [],
        documentsWithRelated: [],
        isLoading: false 
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Vector store clearing failed', isLoading: false });
    }
  },
  resetVectorStore: () => {
    set({
      vectorStorePath: null,
      embeddings: [],
      vectorStoreStats: null,
      selectedDocument: null,
      relatedDocuments: [],
      selectedDocuments: [],
      documentsWithRelated: [],
      batchMode: false,
      similarityConfig: {
        threshold: 0.3,
        maxResults: 50,
        includeMetadataSimilarity: true,
        metadataWeight: 0.3
      }
    });
  },
  
  // New batch operations functions
  toggleDocumentSelection: (documentPath) => {
    const { selectedDocuments } = get();
    const isSelected = selectedDocuments.includes(documentPath);
    
    if (isSelected) {
      set({ selectedDocuments: selectedDocuments.filter(path => path !== documentPath) });
    } else {
      set({ selectedDocuments: [...selectedDocuments, documentPath] });
    }
  },
  
  selectAllDocuments: () => {
    const { vectorStoreStats } = get();
    if (vectorStoreStats?.documentPaths) {
      set({ selectedDocuments: [...vectorStoreStats.documentPaths] });
    }
  },
  
  clearDocumentSelection: () => {
    set({ selectedDocuments: [] });
  },
  
  setBatchMode: (enabled) => {
    set({ batchMode: enabled });
    if (!enabled) {
      set({ selectedDocuments: [], documentsWithRelated: [] });
    }
  },
  
  findRelatedDocumentsBatch: async (documentPaths) => {
    const { similarityConfig } = get();
    
    set({ isLoading: true, error: null });
    try {
      if (!window.correlateAPI) {
        throw new Error('Correlate API not available');
      }
      
      const documentsWithRelated: DocumentWithRelated[] = [];
      
      for (const documentPath of documentPaths) {
        const relatedDocs = await window.correlateAPI.findRelatedDocuments(documentPath, similarityConfig);
        documentsWithRelated.push({
          documentPath,
          relatedDocuments: relatedDocs,
          isApproved: false
        });
      }
      
      set({ documentsWithRelated, isLoading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Batch related document search failed', isLoading: false });
    }
  },
  
  removeRelatedDocument: (documentPath, relatedDocPath) => {
    const { documentsWithRelated } = get();
    const updated = documentsWithRelated.map(doc => {
      if (doc.documentPath === documentPath) {
        return {
          ...doc,
          relatedDocuments: doc.relatedDocuments.filter(related => related.filePath !== relatedDocPath)
        };
      }
      return doc;
    });
    set({ documentsWithRelated: updated });
  },
  
  approveDocumentRelations: (documentPath) => {
    const { documentsWithRelated } = get();
    const updated = documentsWithRelated.map(doc => {
      if (doc.documentPath === documentPath) {
        return { ...doc, isApproved: true };
      }
      return doc;
    });
    set({ documentsWithRelated: updated });
  },
  
  processBatchWikiLinks: async () => {
    const { documentsWithRelated } = get();
    const approvedDocs = documentsWithRelated.filter(doc => doc.isApproved);
    
    set({ isLoading: true, error: null });
    try {
      if (!window.correlateAPI) {
        throw new Error('Correlate API not available');
      }
      
      let processedCount = 0;
      for (const doc of approvedDocs) {
        await window.correlateAPI.addWikiLinksToDocument(doc.documentPath, doc.relatedDocuments);
        processedCount++;
      }
      
      set({ isLoading: false });
      alert(`Batch processing completed! Wiki links added to ${processedCount} documents.`);
      
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Batch wiki link processing failed', isLoading: false });
    }
  },
  
  // New embedding history functions
  addEmbeddingHistory: (directoryPath, documentCount, embeddingCount) => {
    const { embeddingHistory } = get();
    const newEntry: EmbeddingHistory = {
      timestamp: new Date().toISOString(),
      directoryPath,
      documentCount,
      embeddingCount
    };
    
    // Keep only last 10 entries per directory
    const filteredHistory = embeddingHistory.filter(entry => entry.directoryPath !== directoryPath);
    const updatedHistory = [newEntry, ...filteredHistory].slice(0, 20);
    
    set({ embeddingHistory: updatedHistory });
  },
  
  getEmbeddingHistoryForPath: (directoryPath) => {
    const { embeddingHistory } = get();
    return embeddingHistory.find(entry => entry.directoryPath === directoryPath) || null;
  },
  
  // Analytics and sharing functions
  exportEmbeddings: async (libraryPath?: string) => {
    set({ isLoading: true, error: null });
    try {
      if (!window.correlateAPI) {
        throw new Error('Correlate API not available');
      }
      
      const result = await window.correlateAPI.exportEmbeddings(libraryPath);
      set({ isLoading: false });
      
      // Show success message
      alert(`Embeddings successfully exported to: ${result.exportPath}`);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Export failed', isLoading: false });
    }
  },
  
  importEmbeddings: async () => {
    set({ isLoading: true, error: null });
    try {
      if (!window.correlateAPI) {
        throw new Error('Correlate API not available');
      }
      
      const result = await window.correlateAPI.importEmbeddings();
      
      // Update embeddings in store
      set({ 
        embeddings: result.embeddings,
        isLoading: false 
      });
      
      // Show success message
      alert(`Successfully imported ${result.importedCount} embeddings!`);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Import failed', isLoading: false });
    }
  },
  
  getCacheStats: async () => {
    try {
      if (!window.correlateAPI) {
        throw new Error('Correlate API not available');
      }
      
      return await window.correlateAPI.getCacheStats();
    } catch (e) {
      console.error('Failed to get cache stats:', e);
      return null;
    }
  }
})); 