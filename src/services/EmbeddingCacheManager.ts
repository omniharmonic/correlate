import { DocumentEmbedding } from '../shared/types/api';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface EmbeddingCacheEntry {
  libraryPath: string;
  embeddings: DocumentEmbedding[];
  timestamp: string;
  modelUsed: string;
  documentCount: number;
  totalTokens?: number;
}

export interface CacheStatistics {
  totalCaches: number;
  totalEmbeddings: number;
  totalStorageSize: number;
  oldestCache: string | null;
  newestCache: string | null;
  cacheEntries: {
    libraryPath: string;
    timestamp: string;
    embeddingCount: number;
    sizeBytes: number;
  }[];
}

export class EmbeddingCacheManager {
  private cacheDir: string;

  constructor() {
    // Store cache in user data directory
    this.cacheDir = path.join(app.getPath('userData'), 'correlate-embeddings');
    this.ensureCacheDirectoryExists();
  }

  private ensureCacheDirectoryExists(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCacheFilePath(libraryPath: string): string {
    // Create a safe filename from the library path
    const safeFileName = Buffer.from(libraryPath).toString('base64').replace(/[/+]/g, '_') + '.json';
    return path.join(this.cacheDir, safeFileName);
  }

  /**
   * Save embeddings for a specific library path
   */
  async saveEmbeddings(
    embeddings: DocumentEmbedding[], 
    libraryPath: string, 
    modelUsed: string = 'unknown'
  ): Promise<void> {
    try {
      const cacheEntry: EmbeddingCacheEntry = {
        libraryPath,
        embeddings,
        timestamp: new Date().toISOString(),
        modelUsed,
        documentCount: embeddings.length,
        totalTokens: embeddings.reduce((sum, emb) => sum + (emb.content?.length || 0), 0)
      };

      const filePath = this.getCacheFilePath(libraryPath);
      fs.writeFileSync(filePath, JSON.stringify(cacheEntry, null, 2));
      
      console.log(`✅ Saved ${embeddings.length} embeddings to cache for ${libraryPath}`);
    } catch (error) {
      console.error('Failed to save embeddings to cache:', error);
      throw new Error(`Failed to save embeddings cache: ${error.message}`);
    }
  }

  /**
   * Load embeddings for a specific library path
   */
  async loadEmbeddings(libraryPath: string): Promise<DocumentEmbedding[] | null> {
    try {
      const filePath = this.getCacheFilePath(libraryPath);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const cacheEntry: EmbeddingCacheEntry = JSON.parse(fileContent);
      
      console.log(`📚 Loaded ${cacheEntry.embeddings.length} embeddings from cache for ${libraryPath}`);
      return cacheEntry.embeddings;
    } catch (error) {
      console.error('Failed to load embeddings from cache:', error);
      return null;
    }
  }

  /**
   * Get cache statistics for all stored embeddings
   */
  async getCacheStats(): Promise<CacheStatistics> {
    try {
      const files = fs.readdirSync(this.cacheDir).filter(file => file.endsWith('.json'));
      
      let totalEmbeddings = 0;
      let totalStorageSize = 0;
      let oldestCache: string | null = null;
      let newestCache: string | null = null;
      const cacheEntries: CacheStatistics['cacheEntries'] = [];

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const cacheEntry: EmbeddingCacheEntry = JSON.parse(fileContent);

        totalEmbeddings += cacheEntry.embeddings.length;
        totalStorageSize += stats.size;

        if (!oldestCache || cacheEntry.timestamp < oldestCache) {
          oldestCache = cacheEntry.timestamp;
        }
        if (!newestCache || cacheEntry.timestamp > newestCache) {
          newestCache = cacheEntry.timestamp;
        }

        cacheEntries.push({
          libraryPath: cacheEntry.libraryPath,
          timestamp: cacheEntry.timestamp,
          embeddingCount: cacheEntry.embeddings.length,
          sizeBytes: stats.size
        });
      }

      return {
        totalCaches: files.length,
        totalEmbeddings,
        totalStorageSize,
        oldestCache,
        newestCache,
        cacheEntries: cacheEntries.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      };
    } catch (error) {
      console.error('Failed to get cache statistics:', error);
      return {
        totalCaches: 0,
        totalEmbeddings: 0,
        totalStorageSize: 0,
        oldestCache: null,
        newestCache: null,
        cacheEntries: []
      };
    }
  }

  /**
   * Export embeddings to a shareable file
   */
  async exportEmbeddings(exportPath: string, libraryPath?: string): Promise<void> {
    try {
      let exportData: EmbeddingCacheEntry[];

      if (libraryPath) {
        // Export specific library
        const embeddings = await this.loadEmbeddings(libraryPath);
        if (!embeddings) {
          throw new Error(`No embeddings found for library: ${libraryPath}`);
        }
        
        exportData = [{
          libraryPath,
          embeddings,
          timestamp: new Date().toISOString(),
          modelUsed: 'exported',
          documentCount: embeddings.length
        }];
      } else {
        // Export all embeddings
        const files = fs.readdirSync(this.cacheDir).filter(file => file.endsWith('.json'));
        exportData = [];

        for (const file of files) {
          const filePath = path.join(this.cacheDir, file);
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const cacheEntry: EmbeddingCacheEntry = JSON.parse(fileContent);
          exportData.push(cacheEntry);
        }
      }

      const exportBundle = {
        exportedAt: new Date().toISOString(),
        correlateVersion: '1.0.0',
        totalLibraries: exportData.length,
        totalEmbeddings: exportData.reduce((sum, entry) => sum + entry.embeddings.length, 0),
        libraries: exportData
      };

      fs.writeFileSync(exportPath, JSON.stringify(exportBundle, null, 2));
      console.log(`✅ Exported ${exportBundle.totalEmbeddings} embeddings from ${exportBundle.totalLibraries} libraries to ${exportPath}`);
    } catch (error) {
      console.error('Failed to export embeddings:', error);
      throw new Error(`Failed to export embeddings: ${error.message}`);
    }
  }

  /**
   * Import and merge embeddings from a shared file
   */
  async importEmbeddings(importPath: string): Promise<DocumentEmbedding[]> {
    try {
      if (!fs.existsSync(importPath)) {
        throw new Error(`Import file not found: ${importPath}`);
      }

      const fileContent = fs.readFileSync(importPath, 'utf-8');
      const importBundle = JSON.parse(fileContent);

      if (!importBundle.libraries || !Array.isArray(importBundle.libraries)) {
        throw new Error('Invalid import file format');
      }

      let totalImported = 0;
      const allEmbeddings: DocumentEmbedding[] = [];

      for (const library of importBundle.libraries) {
        const cacheEntry: EmbeddingCacheEntry = library;
        
        // Save to cache with imported timestamp
        await this.saveEmbeddings(
          cacheEntry.embeddings, 
          cacheEntry.libraryPath, 
          `imported-${cacheEntry.modelUsed}`
        );
        
        allEmbeddings.push(...cacheEntry.embeddings);
        totalImported += cacheEntry.embeddings.length;
      }

      console.log(`✅ Imported ${totalImported} embeddings from ${importBundle.libraries.length} libraries`);
      return allEmbeddings;
    } catch (error) {
      console.error('Failed to import embeddings:', error);
      throw new Error(`Failed to import embeddings: ${error.message}`);
    }
  }

  /**
   * Clear all cached embeddings
   */
  async clearCache(): Promise<void> {
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        fs.unlinkSync(filePath);
      }
      console.log('✅ Cleared all embedding caches');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw new Error(`Failed to clear cache: ${error.message}`);
    }
  }

  /**
   * Remove cache for a specific library
   */
  async removeCacheForLibrary(libraryPath: string): Promise<void> {
    try {
      const filePath = this.getCacheFilePath(libraryPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Removed cache for library: ${libraryPath}`);
      }
    } catch (error) {
      console.error('Failed to remove library cache:', error);
      throw new Error(`Failed to remove cache: ${error.message}`);
    }
  }
} 