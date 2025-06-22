import React from 'react';
import { useAppStore } from '@/store';
import { useTheme } from '@/components/ThemeProvider/ThemeProvider';

const VectorStorePanel: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [showHelpDialog, setShowHelpDialog] = React.useState(false);
  
  const {
    vectorStorePath,
    embeddings,
    vectorStoreStats,
    selectedDocument,
    relatedDocuments,
    similarityConfig,
    isLoading,
    error,
    batchMode,
    selectedDocuments,
    documentsWithRelated,
    embeddingHistory,
    lastEmbeddingGeneration,
    setVectorStorePath,
    generateEmbeddings,
    indexDocuments,
    findRelatedDocuments,
    addWikiLinksToDocument,
    updateSimilarityConfig,
    clearVectorStore,
    resetVectorStore,
    setBatchMode,
    toggleDocumentSelection,
    selectAllDocuments,
    clearDocumentSelection,
    findRelatedDocumentsBatch,
    removeRelatedDocument,
    approveDocumentRelations,
    processBatchWikiLinks,
    getEmbeddingHistoryForPath,
    exportEmbeddings,
    importEmbeddings,
    getCacheStats
  } = useAppStore();

  const { theme } = useTheme();

  // Listen for reset events from logo click
  React.useEffect(() => {
    const handleReset = () => {
      resetVectorStore();
    };
    
    window.addEventListener('resetVectorStore', handleReset);
    return () => window.removeEventListener('resetVectorStore', handleReset);
  }, [resetVectorStore]);

  // Prevent any scroll behavior during button interactions
  const preventScrollBehavior = React.useCallback((callback: () => void) => {
    // Capture current scroll position
    const currentScroll = window.pageYOffset;
    
    // Execute the callback
    callback();
    
    // Use RAF to ensure DOM updates complete before restoring scroll
    requestAnimationFrame(() => {
      window.scrollTo({ top: currentScroll, behavior: 'instant' });
    });
  }, []);

  const handleSelectDirectory = React.useCallback(async () => {
    if (!window.correlateAPI) return;
    
    preventScrollBehavior(async () => {
      try {
        const path = await window.correlateAPI.selectDirectory();
        if (path) {
          setVectorStorePath(path);
        }
      } catch (error) {
        console.error('Directory selection failed:', error);
      }
    });
  }, [setVectorStorePath, preventScrollBehavior]);

  const canGenerateEmbeddings = vectorStorePath && !isLoading;
  const canIndexDocuments = embeddings.length > 0 && !isLoading;
  const hasIndex = vectorStoreStats && vectorStoreStats.totalDocuments > 0;

  // Get embedding history for current path
  const currentHistory = vectorStorePath ? getEmbeddingHistoryForPath(vectorStorePath) : null;

  // Memoized button handlers to prevent scroll issues
  const handleBatchModeToggle = React.useCallback(() => {
    preventScrollBehavior(() => setBatchMode(!batchMode));
  }, [batchMode, setBatchMode, preventScrollBehavior]);

  const handleSelectAllDocuments = React.useCallback(() => {
    preventScrollBehavior(() => selectAllDocuments());
  }, [selectAllDocuments, preventScrollBehavior]);

  const handleClearDocumentSelection = React.useCallback(() => {
    preventScrollBehavior(() => clearDocumentSelection());
  }, [clearDocumentSelection, preventScrollBehavior]);

  const handleFindRelatedDocumentsBatch = React.useCallback((documents: string[]) => {
    preventScrollBehavior(() => findRelatedDocumentsBatch(documents));
  }, [findRelatedDocumentsBatch, preventScrollBehavior]);

  const handleApproveDocumentRelations = React.useCallback((documentPath: string) => {
    preventScrollBehavior(() => approveDocumentRelations(documentPath));
  }, [approveDocumentRelations, preventScrollBehavior]);

  const handleProcessBatchWikiLinks = React.useCallback(() => {
    preventScrollBehavior(() => processBatchWikiLinks());
  }, [processBatchWikiLinks, preventScrollBehavior]);

  const handleRemoveRelatedDocument = React.useCallback((documentPath: string, relatedDocPath: string) => {
    preventScrollBehavior(() => removeRelatedDocument(documentPath, relatedDocPath));
  }, [removeRelatedDocument, preventScrollBehavior]);

  const handleToggleDocumentSelection = React.useCallback((docPath: string) => {
    preventScrollBehavior(() => toggleDocumentSelection(docPath));
  }, [toggleDocumentSelection, preventScrollBehavior]);

  const ActionButton = ({ 
    onClick, 
    disabled = false, 
    variant = 'primary',
    children 
  }: {
    onClick: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'success';
    children: React.ReactNode;
  }) => {
    const getVariantStyle = () => {
      switch (variant) {
        case 'primary':
          return {
            background: theme === 'lunarpunk' 
              ? 'linear-gradient(135deg, rgb(78, 250, 159), rgb(59, 32, 233))'
              : 'rgb(59, 32, 233)',
            color: 'white',
          };
        case 'secondary':
          return {
            backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.1)' : 'rgb(248, 250, 252)',
            color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
            border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgb(226, 232, 240)',
          };
        case 'success':
          return {
            backgroundColor: 'rgb(34, 197, 94)',
            color: 'white',
          };
        default:
          return {
            background: theme === 'lunarpunk' 
              ? 'linear-gradient(135deg, rgb(78, 250, 159), rgb(59, 32, 233))'
              : 'rgb(59, 32, 233)',
            color: 'white',
          };
      }
    };

    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        disabled={disabled}
        style={{
          ...getVariantStyle(),
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          fontWeight: '500',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          fontSize: '14px',
          transition: 'all 0.2s ease',
          width: '100%'
        }}
      >
        {children}
      </button>
    );
  };

  const ProgressCard = ({ title, description, children }: {
    title: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <div style={{
      padding: '32px',
      borderRadius: '16px',
      border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(226, 232, 240)',
      backgroundColor: theme === 'lunarpunk' ? 'rgba(41, 37, 36, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(16px)',
      marginBottom: '24px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          marginBottom: '8px', 
          color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)'
        }}>{title}</h2>
        <p style={{ 
          color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(38, 34, 34, 0.7)'
        }}>{description}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {children}
      </div>
    </div>
  );

  const EmbeddingHistoryDisplay = () => {
    if (!currentHistory) return null;
    
    const timeAgo = new Date(currentHistory.timestamp).toLocaleDateString();
    
    return (
      <div style={{
        padding: '12px 16px',
        backgroundColor: theme === 'lunarpunk' 
          ? 'rgba(78, 250, 159, 0.1)' 
          : 'rgba(59, 32, 233, 0.1)',
        border: theme === 'lunarpunk'
          ? '1px solid rgba(78, 250, 159, 0.3)'
          : '1px solid rgba(59, 32, 233, 0.3)',
        borderRadius: '8px',
        color: theme === 'lunarpunk' 
          ? 'rgb(78, 250, 159)' 
          : 'rgb(59, 32, 233)',
        fontSize: '12px',
        marginBottom: '8px'
      }}>
        📚 Last embedding generation: {timeAgo} • {currentHistory.embeddingCount} embeddings created
      </div>
    );
  };

  const CacheAnalyticsPanel = () => {
    const [cacheStats, setCacheStats] = React.useState<any>(null);
    const [isLoadingStats, setIsLoadingStats] = React.useState(false);

    const refreshCacheStats = React.useCallback(async () => {
      setIsLoadingStats(true);
      try {
        const stats = await getCacheStats();
        setCacheStats(stats);
      } catch (error) {
        console.error('Failed to load cache stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    }, [getCacheStats]);

    React.useEffect(() => {
      refreshCacheStats();
    }, [refreshCacheStats]);

    const handleExportEmbeddings = React.useCallback(() => {
      preventScrollBehavior(() => exportEmbeddings(vectorStorePath));
    }, [exportEmbeddings, vectorStorePath, preventScrollBehavior]);

    const handleImportEmbeddings = React.useCallback(() => {
      preventScrollBehavior(async () => {
        await importEmbeddings();
        refreshCacheStats(); // Refresh stats after import
      });
    }, [importEmbeddings, refreshCacheStats, preventScrollBehavior]);

    return (
      <div style={{
        padding: '24px',
        borderRadius: '12px',
        border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(226, 232, 240)',
        backgroundColor: theme === 'lunarpunk' ? 'rgba(41, 37, 36, 0.6)' : 'rgba(255, 255, 255, 0.6)',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ 
            margin: 0, 
            color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)',
            fontSize: '18px',
            fontWeight: '600'
          }}>Cache Analytics & Sharing</h3>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              refreshCacheStats();
            }}
            disabled={isLoadingStats}
            style={{
              padding: '4px 8px',
              border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgb(226, 232, 240)',
              backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.1)' : 'rgb(248, 250, 252)',
              color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(38, 34, 34, 0.7)',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {isLoadingStats ? '⟳' : '↻'}
          </button>
        </div>

        {cacheStats && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                padding: '8px 12px',
                backgroundColor: theme === 'lunarpunk' ? 'rgba(78, 250, 159, 0.1)' : 'rgba(59, 32, 233, 0.1)',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <div style={{ 
                  fontSize: '20px', 
                  fontWeight: 'bold',
                  color: theme === 'lunarpunk' ? 'rgb(78, 250, 159)' : 'rgb(59, 32, 233)'
                }}>
                  {cacheStats.totalCaches}
                </div>
                <div style={{ 
                  fontSize: '11px',
                  color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(38, 34, 34, 0.7)'
                }}>
                  Libraries
                </div>
              </div>
              <div style={{
                padding: '8px 12px',
                backgroundColor: theme === 'lunarpunk' ? 'rgba(78, 250, 159, 0.1)' : 'rgba(59, 32, 233, 0.1)',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <div style={{ 
                  fontSize: '20px', 
                  fontWeight: 'bold',
                  color: theme === 'lunarpunk' ? 'rgb(78, 250, 159)' : 'rgb(59, 32, 233)'
                }}>
                  {cacheStats.totalEmbeddings}
                </div>
                <div style={{ 
                  fontSize: '11px',
                  color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(38, 34, 34, 0.7)'
                }}>
                  Total Embeddings
                </div>
              </div>
              <div style={{
                padding: '8px 12px',
                backgroundColor: theme === 'lunarpunk' ? 'rgba(78, 250, 159, 0.1)' : 'rgba(59, 32, 233, 0.1)',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <div style={{ 
                  fontSize: '20px', 
                  fontWeight: 'bold',
                  color: theme === 'lunarpunk' ? 'rgb(78, 250, 159)' : 'rgb(59, 32, 233)'
                }}>
                  {Math.round(cacheStats.totalStorageSize / 1024)}KB
                </div>
                <div style={{ 
                  fontSize: '11px',
                  color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(38, 34, 34, 0.7)'
                }}>
                  Cache Size
                </div>
              </div>
            </div>
            {cacheStats.oldestCache && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                borderRadius: '6px',
                fontSize: '12px',
                color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(38, 34, 34, 0.6)'
              }}>
                📅 Oldest cache: {new Date(cacheStats.oldestCache).toLocaleDateString()}
                {cacheStats.newestCache && ` • Newest: ${new Date(cacheStats.newestCache).toLocaleDateString()}`}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <ActionButton 
            onClick={handleExportEmbeddings}
            disabled={!vectorStorePath || isLoading}
            variant="secondary"
          >
            📤 Export Embeddings
          </ActionButton>
          <ActionButton 
            onClick={handleImportEmbeddings}
            disabled={isLoading}
            variant="secondary"
          >
            📥 Import Embeddings
          </ActionButton>
        </div>
      </div>
    );
  };

  const ConfigurationPanel = () => (
    <div style={{
      padding: '24px',
      borderRadius: '12px',
      border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(226, 232, 240)',
      backgroundColor: theme === 'lunarpunk' ? 'rgba(41, 37, 36, 0.6)' : 'rgba(255, 255, 255, 0.6)',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <h3 style={{ 
          margin: 0, 
          color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)',
          fontSize: '18px',
          fontWeight: '600'
        }}>Similarity Configuration</h3>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowHelpDialog(true);
          }}
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgb(226, 232, 240)',
            backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.1)' : 'rgb(248, 250, 252)',
            color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(38, 34, 34, 0.7)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease'
          }}
          title="Help with similarity configuration"
        >
          ?
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '14px',
            color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)'
          }}>
            Similarity Threshold: {similarityConfig.threshold}
          </label>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.1"
            value={similarityConfig.threshold}
            onChange={(e) => updateSimilarityConfig({ threshold: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
        
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '14px',
            color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)'
          }}>
            Max Results: {similarityConfig.maxResults}
          </label>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={similarityConfig.maxResults}
            onChange={(e) => updateSimilarityConfig({ maxResults: parseInt(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '16px' }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
          fontSize: '14px'
        }}>
          <input
            type="checkbox"
            checked={similarityConfig.includeMetadataSimilarity}
            onChange={(e) => updateSimilarityConfig({ includeMetadataSimilarity: e.target.checked })}
          />
          Include Metadata Similarity
        </label>
        
        {similarityConfig.includeMetadataSimilarity && (
          <div style={{ flex: 1 }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '4px', 
              fontSize: '12px',
              color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(38, 34, 34, 0.7)'
            }}>
              Metadata Weight: {similarityConfig.metadataWeight}
            </label>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.1"
              value={similarityConfig.metadataWeight}
              onChange={(e) => updateSimilarityConfig({ metadataWeight: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>
    </div>
  );

  const BatchModeToggle = () => (
    <div style={{
      padding: '16px',
      borderRadius: '8px',
      border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(226, 232, 240)',
      backgroundColor: theme === 'lunarpunk' ? 'rgba(41, 37, 36, 0.4)' : 'rgba(255, 255, 255, 0.4)',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h4 style={{ 
            margin: 0,
            fontSize: '16px',
            color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)'
          }}>
            Batch Processing Mode
          </h4>
          <p style={{ 
            margin: '4px 0 0 0',
            fontSize: '12px',
            color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(38, 34, 34, 0.7)'
          }}>
            Process multiple documents at once
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleBatchModeToggle();
          }}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: theme === 'lunarpunk' 
              ? 'linear-gradient(135deg, rgb(78, 250, 159), rgb(59, 32, 233))'
              : 'rgb(59, 32, 233)',
            color: 'white',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {batchMode ? 'Exit Batch Mode' : 'Enter Batch Mode'}
        </button>
      </div>
    </div>
  );

  const DocumentSelectionInterface = () => {
    if (!batchMode || !vectorStoreStats?.documentPaths) return null;
    
    return (
      <div style={{
        padding: '24px',
        borderRadius: '12px',
        border: theme === 'lunarpunk' ? '1px solid rgba(78, 250, 159, 0.3)' : '1px solid rgba(59, 32, 233, 0.3)',
        backgroundColor: theme === 'lunarpunk' ? 'rgba(78, 250, 159, 0.05)' : 'rgba(59, 32, 233, 0.05)',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ 
            margin: 0,
            fontSize: '16px',
            color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)'
          }}>
            Select Documents ({selectedDocuments.length}/{vectorStoreStats.documentPaths.length})
          </h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelectAllDocuments();
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: theme === 'lunarpunk' ? 'rgba(78, 250, 159, 0.2)' : 'rgba(59, 32, 233, 0.1)',
                color: theme === 'lunarpunk' ? 'rgb(78, 250, 159)' : 'rgb(59, 32, 233)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Select All
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClearDocumentSelection();
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgb(226, 232, 240)',
                backgroundColor: 'transparent',
                color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          </div>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '8px',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {vectorStoreStats.documentPaths.map((docPath) => (
            <label
              key={docPath}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: selectedDocuments.includes(docPath)
                  ? theme === 'lunarpunk' 
                    ? 'rgba(78, 250, 159, 0.2)' 
                    : 'rgba(59, 32, 233, 0.1)'
                  : 'transparent',
                border: selectedDocuments.includes(docPath)
                  ? theme === 'lunarpunk'
                    ? '1px solid rgba(78, 250, 159, 0.4)'
                    : '1px solid rgba(59, 32, 233, 0.3)'
                  : '1px solid transparent',
                cursor: 'pointer',
                fontSize: '12px',
                color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)'
              }}
            >
              <input
                type="checkbox"
                checked={selectedDocuments.includes(docPath)}
                onChange={() => handleToggleDocumentSelection(docPath)}
                style={{ margin: 0 }}
              />
              {docPath.split('/').pop() || docPath}
            </label>
          ))}
        </div>
        
        {selectedDocuments.length > 0 && (
          <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFindRelatedDocumentsBatch(selectedDocuments);
              }}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                background: theme === 'lunarpunk' 
                  ? 'linear-gradient(135deg, rgb(78, 250, 159), rgb(59, 32, 233))'
                  : 'rgb(59, 32, 233)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              Find Related Documents
            </button>
          </div>
        )}
      </div>
    );
  };

  const BatchResultsInterface = () => {
    if (!batchMode || documentsWithRelated.length === 0) return null;
    
    const approvedCount = documentsWithRelated.filter(doc => doc.isApproved).length;
    const [batchThreshold, setBatchThreshold] = React.useState(0.5);
    
    return (
      <div style={{
        padding: '24px',
        borderRadius: '12px',
        border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(226, 232, 240)',
        backgroundColor: theme === 'lunarpunk' ? 'rgba(41, 37, 36, 0.6)' : 'rgba(255, 255, 255, 0.6)',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ 
            margin: 0,
            fontSize: '16px',
            color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)'
          }}>
            Batch Results ({approvedCount}/{documentsWithRelated.length} approved)
          </h4>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Batch Approve Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ 
                fontSize: '12px',
                color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)'
              }}>
                Batch Approve Above:
              </label>
                             <input
                 type="range"
                 min="0.1"
                 max="0.9"
                 step="0.1"
                 value={batchThreshold}
                 onChange={(e) => {
                   const threshold = parseFloat(e.target.value);
                   setBatchThreshold(threshold);
                 }}
                 style={{ width: '80px' }}
               />
               <span style={{ 
                 fontSize: '10px',
                 color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(38, 34, 34, 0.6)',
                 minWidth: '30px'
               }}>
                 {Math.round(batchThreshold * 100)}%
               </span>
            </div>
            
            {/* Batch Approve Button */}
                         <button
               type="button"
               onClick={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 // Approve all documents with similarity above threshold
                 documentsWithRelated.forEach(doc => {
                   const avgSimilarity = doc.relatedDocuments.reduce((sum, rel) => sum + rel.similarity, 0) / doc.relatedDocuments.length;
                   if (avgSimilarity >= batchThreshold && !doc.isApproved) {
                     approveDocumentRelations(doc.documentPath);
                   }
                 });
               }}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: theme === 'lunarpunk' ? 'rgba(78, 250, 159, 0.2)' : 'rgba(59, 32, 233, 0.1)',
                color: theme === 'lunarpunk' ? 'rgb(78, 250, 159)' : 'rgb(59, 32, 233)',
                fontSize: '10px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Batch Approve
            </button>
            
            {/* Apply Wiki-Links Button */}
            {approvedCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleProcessBatchWikiLinks();
                }}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'rgb(34, 197, 94)',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                Apply Wiki-Links ({approvedCount})
              </button>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px', overflowY: 'auto' }}>
          {documentsWithRelated.map((docWithRelated) => (
            <div
              key={docWithRelated.documentPath}
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: docWithRelated.isApproved
                  ? '1px solid rgba(34, 197, 94, 0.3)'
                  : theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(226, 232, 240)',
                backgroundColor: docWithRelated.isApproved
                  ? 'rgba(34, 197, 94, 0.1)'
                  : theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.05)' : 'rgb(248, 250, 252)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h5 style={{ 
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: '600',
                  color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)'
                }}>
                  {docWithRelated.documentPath.split('/').pop()}
                </h5>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleApproveDocumentRelations(docWithRelated.documentPath);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: docWithRelated.isApproved 
                      ? 'rgb(34, 197, 94)' 
                      : theme === 'lunarpunk' ? 'rgba(78, 250, 159, 0.2)' : 'rgba(59, 32, 233, 0.1)',
                    color: docWithRelated.isApproved 
                      ? 'white'
                      : theme === 'lunarpunk' ? 'rgb(78, 250, 159)' : 'rgb(59, 32, 233)',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  {docWithRelated.isApproved ? '✓ Approved' : 'Approve'}
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {docWithRelated.relatedDocuments.map((relatedDoc, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px',
                      borderRadius: '4px',
                      backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.05)' : 'rgb(255, 255, 255)'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '12px',
                        fontWeight: '500',
                        color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)'
                      }}>
                        {relatedDoc.title}
                      </div>
                      <div style={{ 
                        fontSize: '10px',
                        color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(38, 34, 34, 0.6)'
                      }}>
                        {relatedDoc.reason}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        padding: '2px 6px',
                        backgroundColor: theme === 'lunarpunk' 
                          ? 'rgba(78, 250, 159, 0.2)' 
                          : 'rgba(34, 197, 94, 0.1)',
                        border: theme === 'lunarpunk'
                          ? '1px solid rgba(78, 250, 159, 0.4)'
                          : '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '4px',
                        fontSize: '10px',
                        color: theme === 'lunarpunk' 
                          ? 'rgb(78, 250, 159)' 
                          : 'rgb(34, 197, 94)'
                      }}>
                        {(relatedDoc.similarity * 100).toFixed(1)}%
                      </div>
                      <button
                        type="button"
                                                  onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveRelatedDocument(docWithRelated.documentPath, relatedDoc.filePath);
                          }}
                        style={{
                          padding: '2px 4px',
                          borderRadius: '2px',
                          border: 'none',
                          backgroundColor: 'rgba(250, 82, 115, 0.1)',
                          color: 'rgb(250, 82, 115)',
                          fontSize: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
      
      {/* Step 1: Directory Selection */}
      <ProgressCard
        title="Vector Store & Wiki-Link Generation"
        description="Create embeddings for documents and automatically generate wiki-links based on semantic similarity"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <EmbeddingHistoryDisplay />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{
                padding: '12px 16px',
                border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgb(226, 232, 240)',
                borderRadius: '8px',
                backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.05)' : 'rgb(248, 250, 252)',
                fontSize: '14px',
                color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)'
              }}>
                {vectorStorePath || 'No directory selected'}
              </div>
            </div>
            <ActionButton onClick={() => handleSelectDirectory()} variant="primary">
              Select Directory
            </ActionButton>
          </div>
        </div>
      </ProgressCard>

      {/* Step 2: Generate Embeddings */}
      {vectorStorePath && (
        <ProgressCard
          title="Generate Embeddings"
          description="Create vector embeddings for all markdown documents in the selected directory"
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              {embeddings.length > 0 ? (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  color: 'rgb(34, 197, 94)',
                  fontSize: '14px'
                }}>
                  ✅ {embeddings.length} embeddings generated
                </div>
              ) : (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.05)' : 'rgb(248, 250, 252)',
                  border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgb(226, 232, 240)',
                  borderRadius: '8px',
                  color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
                  fontSize: '14px'
                }}>
                  Ready to generate embeddings
                </div>
              )}
            </div>
            <ActionButton onClick={() => { generateEmbeddings(); }} disabled={!canGenerateEmbeddings}>
              {embeddings.length > 0 ? 'Regenerate Embeddings' : 'Generate Embeddings'}
            </ActionButton>
          </div>
        </ProgressCard>
      )}

      {/* Step 3: Index Documents */}
      {embeddings.length > 0 && (
        <ProgressCard
          title="Index Documents"
          description="Create a searchable vector store index for similarity search"
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              {vectorStoreStats ? (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  color: 'rgb(34, 197, 94)',
                  fontSize: '14px'
                }}>
                  ✅ {vectorStoreStats.totalDocuments} documents indexed
                </div>
              ) : (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.05)' : 'rgb(248, 250, 252)',
                  border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgb(226, 232, 240)',
                  borderRadius: '8px',
                  color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
                  fontSize: '14px'
                }}>
                  Ready to index documents
                </div>
              )}
            </div>
            <ActionButton onClick={() => { indexDocuments(); }} disabled={!canIndexDocuments}>
              {vectorStoreStats ? 'Reindex Documents' : 'Index Documents'}
            </ActionButton>
          </div>
        </ProgressCard>
      )}

      {/* Step 4: Similarity Configuration & Document Search */}
      {hasIndex && (
        <>
          <ConfigurationPanel />
          
          {/* Batch Mode Toggle */}
          <BatchModeToggle />
          
          {/* Batch Mode Interface */}
          {batchMode ? (
            <>
              <DocumentSelectionInterface />
              <BatchResultsInterface />
            </>
          ) : (
            /* Single Document Mode */
            <ProgressCard
              title="Find Related Documents"
              description="Select a document to find semantically similar documents and generate wiki-links"
            >
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px',
                  color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)'
                }}>
                  Select Document:
                </label>
                <select
                  value={selectedDocument || ''}
                  onChange={(e) => {
                    e.preventDefault();
                    findRelatedDocuments(e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgb(226, 232, 240)',
                    borderRadius: '8px',
                    backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.05)' : 'rgb(248, 250, 252)',
                    color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select a document...</option>
                  {vectorStoreStats?.documentPaths.map(path => (
                    <option key={path} value={path}>
                      {path.split('/').pop() || path}
                    </option>
                  ))}
                </select>
              </div>

              {relatedDocuments.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ 
                    marginBottom: '12px',
                    color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)',
                    fontSize: '16px'
                  }}>
                    Related Documents ({relatedDocuments.length}):
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {relatedDocuments.map((doc, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '12px',
                          border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(226, 232, 240)',
                          borderRadius: '8px',
                          backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.05)' : 'rgb(248, 250, 252)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ 
                              fontWeight: '500',
                              color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)',
                              fontSize: '14px'
                            }}>
                              {doc.title}
                            </div>
                            <div style={{ 
                              fontSize: '12px',
                              color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(38, 34, 34, 0.6)',
                              marginTop: '2px'
                            }}>
                              {doc.reason} • Similarity: {(doc.similarity * 100).toFixed(1)}%
                            </div>
                          </div>
                          <div style={{
                            padding: '4px 8px',
                            backgroundColor: theme === 'lunarpunk' 
                              ? 'rgba(78, 250, 159, 0.2)' 
                              : 'rgba(34, 197, 94, 0.1)',
                            border: theme === 'lunarpunk'
                              ? '1px solid rgba(78, 250, 159, 0.4)'
                              : '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: theme === 'lunarpunk' 
                              ? 'rgb(78, 250, 159)' 
                              : 'rgb(34, 197, 94)'
                          }}>
                            {(doc.similarity * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDocument && relatedDocuments.length > 0 && (
                <ActionButton 
                  onClick={() => { addWikiLinksToDocument(selectedDocument!); }}
                  variant="success"
                >
                  Add Wiki-Links to Document
                </ActionButton>
              )}
            </ProgressCard>
          )}
        </>
      )}

      {/* Management Actions */}
      {(embeddings.length > 0 || vectorStoreStats) && (
        <>
          <CacheAnalyticsPanel />
          <ProgressCard
            title="Vector Store Management"
            description="Manage your vector store index and embeddings"
          >
            <div style={{ display: 'flex', gap: '12px' }}>
              <ActionButton onClick={() => { clearVectorStore(); }} variant="primary">
                Clear Vector Store
              </ActionButton>
              <ActionButton onClick={() => { resetVectorStore(); }} variant="primary">
                Reset All Settings
              </ActionButton>
            </div>
          </ProgressCard>
        </>
      )}

      {/* Help Dialog */}
      {showHelpDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div style={{
            backgroundColor: theme === 'lunarpunk' ? 'rgb(41, 37, 36)' : 'white',
            padding: '32px',
            borderRadius: '16px',
            border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(226, 232, 240)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)'
              }}>
                Similarity Configuration Help
              </h3>
              <p style={{ 
                color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '24px'
              }}>
                Understanding the parameters for finding related documents and generating wiki-links.
              </p>
              
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  marginBottom: '12px',
                  color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)'
                }}>
                  Similarity Threshold (0.1 - 0.9)
                </h4>
                <p style={{ 
                  color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
                  lineHeight: '1.6',
                  marginBottom: '16px'
                }}>
                  Controls how similar documents need to be to be considered "related". Higher values find fewer but more similar documents.
                </p>
                <ul style={{ 
                  color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
                  lineHeight: '1.6',
                  paddingLeft: '20px',
                  marginBottom: '16px'
                }}>
                  <li><strong>0.1-0.3:</strong> Very inclusive - finds loosely related documents</li>
                  <li><strong>0.4-0.6:</strong> Moderate - balanced similarity matching</li>
                  <li><strong>0.7-0.9:</strong> Strict - only very similar documents</li>
                </ul>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  marginBottom: '12px',
                  color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)'
                }}>
                  Max Results (1 - 100)
                </h4>
                <p style={{ 
                  color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
                  lineHeight: '1.6',
                  marginBottom: '16px'
                }}>
                  The maximum number of related documents to find for each source document. More results provide more linking opportunities but may include less relevant connections.
                </p>
                <ul style={{ 
                  color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
                  lineHeight: '1.6',
                  paddingLeft: '20px',
                  marginBottom: '16px'
                }}>
                  <li><strong>1-5:</strong> Focused - only the most relevant connections</li>
                  <li><strong>6-20:</strong> Moderate - good balance of quality and coverage</li>
                  <li><strong>21+:</strong> Comprehensive - extensive linking network</li>
                </ul>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  marginBottom: '12px',
                  color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)'
                }}>
                  Include Metadata Similarity
                </h4>
                <p style={{ 
                  color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
                  lineHeight: '1.6',
                  marginBottom: '16px'
                }}>
                  When enabled, considers document metadata (tags, categories, titles) in addition to content when calculating similarity. This can improve relevance for documents with shared themes or categories.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  marginBottom: '12px',
                  color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)'
                }}>
                  Metadata Weight (0.1 - 0.9)
                </h4>
                <p style={{ 
                  color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
                  lineHeight: '1.6',
                  marginBottom: '16px'
                }}>
                  When metadata similarity is enabled, this controls how much influence metadata has versus content similarity.
                </p>
                <ul style={{ 
                  color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
                  lineHeight: '1.6',
                  paddingLeft: '20px',
                  marginBottom: '16px'
                }}>
                  <li><strong>0.1-0.3:</strong> Content-focused - metadata has minimal influence</li>
                  <li><strong>0.4-0.6:</strong> Balanced - equal consideration of content and metadata</li>
                  <li><strong>0.7-0.9:</strong> Metadata-focused - tags and categories heavily influence results</li>
                </ul>
              </div>

              <div style={{ 
                backgroundColor: theme === 'lunarpunk' ? 'rgba(78, 250, 159, 0.1)' : 'rgba(59, 32, 233, 0.1)',
                padding: '16px',
                borderRadius: '8px',
                border: theme === 'lunarpunk' ? '1px solid rgba(78, 250, 159, 0.3)' : '1px solid rgba(59, 32, 233, 0.3)'
              }}>
                <p style={{ 
                  fontSize: '14px',
                  color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
                  margin: 0,
                  lineHeight: '1.6'
                }}>
                  💡 <strong>Tip:</strong> Start with moderate settings (threshold: 0.4, max results: 10) and adjust based on your results. You can always regenerate wiki-links with different parameters.
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowHelpDialog(false);
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: theme === 'lunarpunk' 
                    ? 'linear-gradient(135deg, rgb(78, 250, 159), rgb(59, 32, 233))'
                    : 'rgb(59, 32, 233)',
                  color: 'white',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VectorStorePanel; 