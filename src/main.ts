import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import fs from 'node:fs/promises';
import yaml from 'js-yaml';
import started from 'electron-squirrel-startup';
import { CorrelationEngine } from './services/CorrelationEngine';
import { FileSystemManager } from './services/FileSystemManager';
import { TranslationEngine } from './services/TranslationEngine';
import { EmbeddingService } from './services/EmbeddingService';
import { DocumentSimilarityEngine } from './services/DocumentSimilarityEngine';
import { TranslationSample } from './shared/types/translation';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open DevTools only in development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
  
  // Setup auto-updater
  setupAutoUpdater();
};

// Auto-updater setup and configuration
const setupAutoUpdater = () => {
  // Configure updater
  autoUpdater.checkForUpdatesAndNotify();
  
  // Auto-updater events
  autoUpdater.on('checking-for-update', () => {
    console.log('🔍 Checking for updates...');
  });
  
  autoUpdater.on('update-available', (info) => {
    console.log('🎉 Update available:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info);
    }
  });
  
  autoUpdater.on('update-not-available', (info) => {
    console.log('✅ App is up to date:', info.version);
  });
  
  autoUpdater.on('error', (err) => {
    console.error('❌ Auto-updater error:', err);
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    const logMessage = `📥 Download progress: ${progressObj.percent.toFixed(2)}% (${progressObj.bytesPerSecond} bytes/sec)`;
    console.log(logMessage);
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('🎊 Update downloaded, ready to install:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-ready', info);
    }
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  const correlationEngine = new CorrelationEngine();
  const fileSystemManager = new FileSystemManager();
  const translationEngine = new TranslationEngine();
  const embeddingService = new EmbeddingService({ model: 'ollama', batchSize: 5 });
  const similarityEngine = new DocumentSimilarityEngine({
    threshold: 0.3,
    maxResults: 5,
    includeMetadataSimilarity: true,
    metadataWeight: 0.3
  });

  ipcMain.handle('correlate:run', async (event, sourceSchema, targetSchema) => {
    try {
      const result = await correlationEngine.generateCorrelation(sourceSchema, targetSchema);
      return { success: true, data: result };
    } catch (error) {
      console.error('Correlation failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:selectDirectory', async () => {
    try {
      const result = await fileSystemManager.selectDirectoryDialog();
      return { success: true, data: result };
    } catch (error) {
      console.error('Directory selection failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:getSchemas', async (event, sourcePath, targetPath) => {
    try {
      const schemas = await fileSystemManager.getSchemasFromDirectories(sourcePath, targetPath);
      return { success: true, data: schemas };
    } catch (error) {
      console.error('Schema retrieval failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:processDocuments', async (event, sourcePath, targetPath, approvedTranslations) => {
    try {
      console.log('🚀 Starting document processing with approved translations:', { 
        sourcePath, 
        targetPath, 
        approvedCount: approvedTranslations.length 
      });
      
      // Get schemas for translation context
      const schemas = await fileSystemManager.getSchemasFromDirectories(sourcePath, targetPath);
      const { sourceSchema, targetSchema } = schemas;
      console.log('📋 Schemas loaded:', {
        source: { name: sourceSchema.name, fields: sourceSchema.fields.length },
        target: { name: targetSchema.name, fields: targetSchema.fields.length }
      });
      
      // Read all markdown files from source directory
      const documents = await fileSystemManager.readMarkdownFiles(sourcePath);
      console.log(`📄 Found ${documents.length} documents to process`);
      
      if (documents.length === 0) {
        throw new Error('No documents found in source directory');
      }
      
      // Convert approved translations to correlation mappings
      const mappings = approvedTranslations.map((translation: TranslationSample) => {
        const sourceTag = translation.sourceTag.trim();
        const translatedTag = translation.translatedTag.trim();
        
        // Extract field names (before the colon)
        const sourceFieldName = sourceTag.split(':')[0].trim();
        const targetFieldName = translatedTag.split(':')[0].trim();
        
        // Find the actual schema fields
        const sourceField = sourceSchema.fields.find(f => f.name === sourceFieldName) || 
                          { name: sourceFieldName, type: 'string', description: '' };
        const targetField = targetSchema.fields.find(f => f.name === targetFieldName) || 
                          { name: targetFieldName, type: 'string', description: '' };
        
        // Extract values (after the colon) for transformation
        const sourceValue = sourceTag.includes(':') ? sourceTag.split(':')[1].trim().replace(/['"]/g, '') : null;
        const targetValue = translatedTag.includes(':') ? translatedTag.split(':')[1].trim().replace(/['"]/g, '') : null;
        
        return {
          sourceField,
          targetField,
          confidence: 1.0, // User-approved translations have high confidence
          transform: (value: any) => {
            // If we have specific value transformations, apply them
            if (sourceValue && targetValue && value === sourceValue) {
              return targetValue;
            }
            
            // For array values, transform matching elements
            if (Array.isArray(value) && sourceValue && targetValue) {
              return value.map(v => v === sourceValue ? targetValue : v);
            }
            
            // Otherwise, pass through the value as-is
            return value;
          }
        };
      });
      
      console.log(`🔗 Created ${mappings.length} translation mappings from approved samples`);
      
      // Create output directory
      const outputPath = path.join(targetPath, 'translated-documents');
      await fileSystemManager.ensureDirectoryExists(outputPath);
      console.log(`📁 Output directory prepared: ${outputPath}`);
      
      // Process each document using the translation engine
      const translatedDocuments = [];
      let processedCount = 0;
      let errorCount = 0;
      
      for (const doc of documents) {
        try {
          console.log(`\n🔄 Processing: ${path.basename(doc.filePath)}`);
          console.log(`📋 Original frontmatter fields: ${Object.keys(doc.frontmatter).join(', ')}`);
          
          // Apply translations using the translation engine
          const translatedDoc = translationEngine.translateDocument(doc, mappings, targetSchema);
          
          // Generate output file path
          const filename = path.basename(doc.filePath);
          const outputFilePath = path.join(outputPath, filename);
          
          // Format the translated document content
          let frontmatterYaml = '';
          if (Object.keys(translatedDoc.frontmatter).length > 0) {
            try {
              frontmatterYaml = `---\n${yaml.dump(translatedDoc.frontmatter, { 
                indent: 2, 
                lineWidth: -1,
                noRefs: true,
                sortKeys: false
              })}---\n\n`;
            } catch (yamlError) {
              console.warn('⚠️ YAML formatting failed, using fallback:', yamlError.message);
              // Fallback to simple key-value format
              const entries = Object.entries(translatedDoc.frontmatter)
                .map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
              frontmatterYaml = `---\n${entries.join('\n')}\n---\n\n`;
            }
          }
          
          const fullContent = frontmatterYaml + translatedDoc.content;
          
          // Write the translated document
          await fs.writeFile(outputFilePath, fullContent, 'utf8');
          
          translatedDocuments.push({
            originalPath: doc.filePath,
            outputPath: outputFilePath,
            originalFields: Object.keys(doc.frontmatter).length,
            translatedFields: Object.keys(translatedDoc.frontmatter).length
          });
          
          processedCount++;
          console.log(`✅ Translated: ${filename}`);
          console.log(`   Fields: ${Object.keys(doc.frontmatter).length} → ${Object.keys(translatedDoc.frontmatter).length}`);
          console.log(`   Output: ${outputFilePath}`);
          
        } catch (docError) {
          errorCount++;
          console.error(`❌ Failed to process ${doc.filePath}:`, docError);
        }
      }
      
      // Final summary
      console.log(`\n🎉 Document processing completed!`);
      console.log(`📊 Results:`);
      console.log(`   - Total documents: ${documents.length}`);
      console.log(`   - Successfully processed: ${processedCount}`);
      console.log(`   - Errors: ${errorCount}`);
      console.log(`   - Output directory: ${outputPath}`);
      
      return { 
        success: true, 
        data: { 
          processedCount,
          errorCount,
          totalDocuments: documents.length,
          outputPath,
          translatedDocuments
        } 
      };
      
    } catch (error) {
      console.error('❌ Document processing failed:', error);
      return { success: false, error: error.message };
    }
  });

  // New vector store handlers
  ipcMain.handle('vector:generateEmbeddings', async (event, directoryPath) => {
    try {
      console.log(`🔍 Generating embeddings for directory: ${directoryPath}`);
      const documents = await fileSystemManager.readMarkdownFiles(directoryPath);
      const embeddings = await embeddingService.generateEmbeddings(documents, directoryPath);
      return { success: true, data: embeddings };
    } catch (error) {
      console.error('Embedding generation failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('vector:indexDocuments', async (event, embeddings) => {
    try {
      console.log(`📚 Indexing ${embeddings.length} documents for similarity search`);
      similarityEngine.indexDocuments(embeddings);
      const stats = similarityEngine.getIndexStats();
      return { 
        success: true, 
        data: {
          ...stats,
          lastIndexed: new Date()
        }
      };
    } catch (error) {
      console.error('Document indexing failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('vector:findRelatedDocuments', async (event, documentPath, config) => {
    try {
      console.log(`🔍 Finding related documents for: ${documentPath}`);
      
      // Find the document and its embedding from the index
      const stats = similarityEngine.getIndexStats();
      if (!stats.documentPaths.includes(documentPath)) {
        throw new Error('Document not found in vector store index');
      }

      // Load the specific document
      const document = await fileSystemManager.readSingleMarkdownFile(documentPath);
      
      // Generate embedding for query document if not already indexed
      const embeddings = await embeddingService.generateEmbeddings([document]);
      const queryEmbedding = embeddings[0];

      // Update similarity config if provided
      if (config) {
        const currentConfig = similarityEngine.getConfig();
        const newEngine = new DocumentSimilarityEngine({ ...currentConfig, ...config });
        const currentStats = similarityEngine.getIndexStats();
        
        // Transfer existing index to new engine
        const allEmbeddings = await embeddingService.generateEmbeddings(
          await Promise.all(currentStats.documentPaths.map(path => 
            fileSystemManager.readSingleMarkdownFile(path)
          ))
        );
        newEngine.indexDocuments(allEmbeddings);
        
        const relatedDocs = await newEngine.findRelatedDocuments(document, queryEmbedding);
        return { success: true, data: relatedDocs };
      }

      const relatedDocs = await similarityEngine.findRelatedDocuments(document, queryEmbedding);
      return { success: true, data: relatedDocs };
    } catch (error) {
      console.error('Related document search failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('vector:addWikiLinksToDocument', async (event, documentPath, relatedDocs) => {
    try {
      console.log(`📎 Adding wiki links to document: ${documentPath}`);
      
      const document = await fileSystemManager.readSingleMarkdownFile(documentPath);
      const enhancedDoc = similarityEngine.addRelatedLinksToDocument(document, relatedDocs);
      
      // Write the enhanced document back to the file system
      await fileSystemManager.writeMarkdownFile(documentPath, enhancedDoc);
      
      return { success: true, data: enhancedDoc };
    } catch (error) {
      console.error('Wiki link addition failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('vector:getStats', async () => {
    try {
      const stats = similarityEngine.getIndexStats();
      return { 
        success: true, 
        data: {
          ...stats,
          lastIndexed: new Date() // This would be stored persistently in production
        }
      };
    } catch (error) {
      console.error('Vector store stats retrieval failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('vector:clearStore', async () => {
    try {
      console.log('🗑️ Clearing vector store index');
      similarityEngine.indexDocuments([]); // Clear by indexing empty array
      embeddingService.clearCache();
      return { success: true, data: null };
    } catch (error) {
      console.error('Vector store clearing failed:', error);
      return { success: false, error: error.message };
    }
  });



  // Auto-updater IPC handlers
  ipcMain.handle('app:checkForUpdates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, data: result };
    } catch (error) {
      console.error('Check for updates failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('app:installUpdate', async () => {
    try {
      autoUpdater.quitAndInstall();
      return { success: true };
    } catch (error) {
      console.error('Install update failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Export/Import embedding handlers
  ipcMain.handle('vector:exportEmbeddings', async (event, libraryPath) => {
    try {
      // Get the current focused window
      const currentWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (!currentWindow) {
        throw new Error('No window available for dialog');
      }

      // Show save dialog for export
      const { canceled, filePath } = await dialog.showSaveDialog(currentWindow, {
        title: 'Export Embeddings',
        defaultPath: `correlate-embeddings-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (canceled || !filePath) {
        return { success: false, error: 'Export cancelled' };
      }

      await embeddingService.exportEmbeddings(filePath, libraryPath);
      return { success: true, data: { exportPath: filePath } };
    } catch (error) {
      console.error('Export embeddings failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('vector:importEmbeddings', async () => {
    try {
      // Get the current focused window
      const currentWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (!currentWindow) {
        throw new Error('No window available for dialog');
      }

      // Show open dialog for import
      const { canceled, filePaths } = await dialog.showOpenDialog(currentWindow, {
        title: 'Import Embeddings',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (canceled || filePaths.length === 0) {
        return { success: false, error: 'Import cancelled' };
      }

      const embeddings = await embeddingService.importEmbeddings(filePaths[0]);
      return { success: true, data: { importedCount: embeddings.length, embeddings } };
    } catch (error) {
      console.error('Import embeddings failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Cache statistics handler
  ipcMain.handle('vector:getCacheStats', async () => {
    try {
      const stats = await embeddingService.getPersistentCacheStats();
      return { success: true, data: stats };
    } catch (error) {
      console.error('Get cache stats failed:', error);
      return { success: false, error: error.message };
    }
  });



  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
