import React from 'react';
import { useAppStore } from '@/store';
import DirectorySelector from '@/components/DirectorySelector/DirectorySelector';
import ReviewPanel from '@/components/ReviewPanel/ReviewPanel';
import VectorStorePanel from '@/components/VectorStorePanel/VectorStorePanel';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTheme } from '@/components/ThemeProvider/ThemeProvider';

const App: React.FC = () => {
  const {
    activeTab,
    sourcePath,
    targetPath,
    sourceSchema,
    targetSchema,
    sampleTranslations,
    approvedTranslations,
    rejectedTranslations,
    isLoading,
    error,
    correlationCompleted,
    readyForProcessing,
    setActiveTab,
    fetchSchemas,
    runCorrelation,
    approveSample,
    rejectSample,
    editSample,
    processDocuments,
    resetWorkflow
  } = useAppStore();

  const { theme } = useTheme();
  
  // State for dialogs
  const [showResetDialog, setShowResetDialog] = React.useState(false);
  const [showAboutDialog, setShowAboutDialog] = React.useState(false);

  const canFetchSchemas = sourcePath && targetPath && !sourceSchema && !targetSchema;
  const canRunCorrelation = sourceSchema && targetSchema && !correlationCompleted;
  const canProcessDocuments = readyForProcessing && approvedTranslations.length > 0;

  // Check if there's any progress to lose
  const hasProgress = sourcePath || targetPath || sourceSchema || targetSchema || sampleTranslations.length > 0;

  const handleLogoClick = () => {
    if (hasProgress) {
      setShowResetDialog(true);
    } else {
      resetWorkflow();
    }
  };

  const handleResetConfirm = () => {
    // Reset Schema Correlation workflow
    resetWorkflow();
    // Also trigger vector store reset by dispatching a custom event
    window.dispatchEvent(new CustomEvent('resetVectorStore'));
    setShowResetDialog(false);
  };

  const handleResetCancel = () => {
    setShowResetDialog(false);
  };

  const getApprovalProgress = () => {
    if (sampleTranslations.length === 0) return 0;
    return Math.round((approvedTranslations.length / sampleTranslations.length) * 100);
  };

  // Landing page when no progress
  const isLandingPage = !hasProgress && activeTab === 'correlation';

  // Tab Navigation Component
  const TabNavigation = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '32px',
      padding: '4px',
      backgroundColor: theme === 'lunarpunk' ? 'rgba(41, 37, 36, 0.6)' : 'rgba(255, 255, 255, 0.6)',
      borderRadius: '12px',
      border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(226, 232, 240)',
      backdropFilter: 'blur(16px)',
      maxWidth: '400px',
      margin: '0 auto 32px auto'
    }}>
      <button
        onClick={() => setActiveTab('correlation')}
        style={{
          flex: 1,
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          fontWeight: '500',
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          backgroundColor: activeTab === 'correlation' 
            ? (theme === 'lunarpunk' 
              ? 'rgba(78, 250, 159, 0.2)' 
              : 'rgba(59, 32, 233, 0.1)')
            : 'transparent',
          color: activeTab === 'correlation'
            ? (theme === 'lunarpunk' ? 'rgb(78, 250, 159)' : 'rgb(59, 32, 233)')
            : (theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(38, 34, 34, 0.7)')
        }}
      >
        <span style={{ marginRight: '8px' }}>🔄</span>
        Align Schemas
      </button>
      
      <button
        onClick={() => setActiveTab('vector-store')}
        style={{
          flex: 1,
          padding: '12px 24px',
          borderRadius: '8px',
          fontWeight: '500',
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          backgroundColor: activeTab === 'vector-store' 
            ? (theme === 'lunarpunk' 
              ? 'rgba(78, 250, 159, 0.2)' 
              : 'rgba(59, 32, 233, 0.1)')
            : 'transparent',
          color: activeTab === 'vector-store'
            ? (theme === 'lunarpunk' ? 'rgb(78, 250, 159)' : 'rgb(59, 32, 233)')
            : (theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(38, 34, 34, 0.7)'),
          border: activeTab === 'vector-store'
            ? (theme === 'lunarpunk' 
              ? '1px solid rgba(78, 250, 159, 0.3)' 
              : '1px solid rgba(59, 32, 233, 0.3)')
            : '1px solid transparent'
        }}
      >
        <span style={{ marginRight: '8px' }}>🧠</span>
        Generate Links
      </button>
    </div>
  );

  // Header section - always visible on both tabs
  const HeaderSection = () => (
    <div style={{ 
      textAlign: 'center', 
      marginBottom: '16px',
      padding: '32px 24px'
    }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 'bold',
          backgroundImage: theme === 'lunarpunk'
            ? 'linear-gradient(135deg, rgb(78, 250, 159), rgb(59, 32, 233))'
            : 'linear-gradient(135deg, rgb(59, 32, 233), rgb(78, 250, 159))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          margin: 0,
          marginBottom: '12px'
        }}>
          Correlate
        </h1>
        <p style={{ 
          fontSize: '18px',
          color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
          marginBottom: '24px',
          maxWidth: '600px',
          margin: '0 auto 24px auto'
        }}>
          Align and connect knowledge with AI-powered correlation.
        </p>
        <ActionButton 
          onClick={() => setShowAboutDialog(true)} 
          variant="secondary"
        >
          Learn How It Works
        </ActionButton>
      </div>
    </div>
  );

  const LoadingIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ 
          width: '20px', 
          height: '20px', 
          border: '2px solid rgba(59, 32, 233, 0.3)', 
          borderRadius: '50%', 
          borderTop: '2px solid rgb(59, 32, 233)', 
          animation: 'spin 1s linear infinite' 
        }}></div>
      </div>
      <span style={{ color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(38, 34, 34, 0.7)' }}>Processing...</span>
    </div>
  );

  const ErrorCard = ({ message }: { message: string }) => (
    <div style={{
      padding: '24px',
      borderRadius: '16px',
      border: '1px solid rgba(250, 82, 115, 0.2)',
      backgroundColor: 'rgba(250, 82, 115, 0.05)',
      backdropFilter: 'blur(16px)',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: 'rgba(250, 82, 115, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <svg style={{ width: '16px', height: '16px', color: 'rgb(250, 82, 115)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 style={{ fontWeight: '500', color: 'rgb(250, 82, 115)' }}>Error</h3>
          <p style={{ fontSize: '14px', color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(38, 34, 34, 0.7)', marginTop: '4px' }}>{message}</p>
        </div>
      </div>
    </div>
  );

  const ProgressCard = ({ title, description, progress, children }: {
    title: string;
    description: string;
    progress?: number;
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
        {progress !== undefined && (
          <div style={{ marginTop: '16px' }}>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.1)' : 'rgb(226, 232, 240)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(135deg, rgb(78, 250, 159), rgb(59, 32, 233))',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <p style={{ 
              fontSize: '12px', 
              marginTop: '8px',
              color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(38, 34, 34, 0.6)'
            }}>
              {progress}% approved
            </p>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {children}
      </div>
    </div>
  );

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
          maxWidth: '300px'
        }}
      >
        {children}
      </button>
    );
  };

    const SchemaCorrelationContent = () => (
    <>
      {/* Directory Selection */}
      <DirectorySelector />

      {/* Schema Correlation */}
      {canFetchSchemas && (
        <ProgressCard
          title="Load Schemas"
          description="Discover and analyze the schema structure from both directories"
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{
                padding: '12px 16px',
                backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.05)' : 'rgb(248, 250, 252)',
                border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgb(226, 232, 240)',
                borderRadius: '8px',
                fontSize: '14px',
                color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)'
              }}>
                Ready to analyze schemas
              </div>
            </div>
            <ActionButton onClick={fetchSchemas} disabled={isLoading}>
              Load Schemas
            </ActionButton>
          </div>
        </ProgressCard>
      )}

      {sourceSchema && targetSchema && !correlationCompleted && (
        <ProgressCard
          title="Generate Correlations"
          description="Analyze schemas and generate tag mapping suggestions using AI"
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px',
                color: 'rgb(34, 197, 94)',
                fontSize: '14px'
              }}>
                ✅ Schemas loaded successfully
              </div>
            </div>
            <ActionButton onClick={runCorrelation} disabled={!canRunCorrelation || isLoading}>
              Generate Correlations
            </ActionButton>
          </div>
        </ProgressCard>
      )}

      {sampleTranslations.length > 0 && (
        <>
          <ReviewPanel 
            sampleTranslations={sampleTranslations}
            approvedTranslations={approvedTranslations}
            rejectedTranslations={rejectedTranslations}
            onApprove={approveSample}
            onReject={rejectSample}
            onEdit={editSample}
          />
          
          {/* Progress tracking and final processing step */}
          {correlationCompleted && (
            <ProgressCard
              title="Process Documents"
              description="Apply approved tag translations to all documents in your source library"
              progress={getApprovalProgress()}
            >
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  {readyForProcessing ? (
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '8px',
                      color: 'rgb(34, 197, 94)',
                      fontSize: '14px'
                    }}>
                      ✅ Ready to process documents ({approvedTranslations.length} mappings approved)
                    </div>
                  ) : (
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.05)' : 'rgb(248, 250, 252)',
                      border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgb(226, 232, 240)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)'
                    }}>
                      Approve at least one mapping to process documents ({approvedTranslations.length}/{sampleTranslations.length} approved)
                    </div>
                  )}
                </div>
                <ActionButton 
                  onClick={processDocuments} 
                  disabled={!canProcessDocuments || isLoading}
                  variant="success"
                >
                  Process Documents
                </ActionButton>
              </div>
            </ProgressCard>
          )}
          
          {/* Reset Workflow Button */}
          {hasProgress && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
              <ActionButton 
                onClick={() => setShowResetDialog(true)} 
                variant="secondary"
              >
                🔄 Reset Schema Correlation Workflow
              </ActionButton>
            </div>
          )}
        </>
      )}
    </>
  );

  const AboutDialog = () => (
    showAboutDialog && (
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
              About Correlate
            </h3>
            <p style={{ 
              color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
              Correlate is an intelligent knowledge translation tool that helps you migrate and transform content between different schema formats using AI-powered correlation.
            </p>
            
            <h4 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              marginBottom: '12px',
              color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)'
            }}>
              How to Use Schema Correlation:
            </h4>
            <ul style={{ 
              color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
              lineHeight: '1.6',
              marginBottom: '24px',
              paddingLeft: '20px'
            }}>
              <li>Select your source library (documents to translate from)</li>
              <li>Select your target library (schema to translate to)</li>
              <li>Load schemas and generate AI-powered correlations</li>
              <li>Review and approve translation samples</li>
              <li>Process your documents with the approved translations</li>
            </ul>

            <h4 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              marginBottom: '12px',
              color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)'
            }}>
              How to Use Vector Store:
            </h4>
            <ul style={{ 
              color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
              lineHeight: '1.6',
              marginBottom: '24px',
              paddingLeft: '20px'
            }}>
              <li>Select a directory containing markdown documents</li>
              <li>Generate embeddings for semantic analysis</li>
              <li>Index documents in the vector store</li>
              <li>Configure similarity thresholds and find related documents</li>
              <li>Automatically generate wiki-links between related content</li>
            </ul>

            <h4 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              marginBottom: '12px',
              color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)'
            }}>
              AI Engine - Ollama Setup:
            </h4>
            <div style={{ 
              color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
              <p style={{ marginBottom: '12px' }}>
                Correlate uses <strong>Ollama</strong> as its local AI engine for schema correlation and text processing. This ensures your data stays private and secure on your machine.
              </p>
              
              <h5 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                marginBottom: '8px',
                color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)'
              }}>
                Installation Steps:
              </h5>
              <ol style={{ paddingLeft: '20px', marginBottom: '16px' }}>
                <li><strong>Download Ollama:</strong> Visit <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" style={{ color: theme === 'lunarpunk' ? 'rgb(78, 250, 159)' : 'rgb(59, 32, 233)', textDecoration: 'underline' }}>ollama.ai</a> and download for your operating system</li>
                <li><strong>Install and Run:</strong> Follow the installation guide and start Ollama</li>
                <li><strong>Download a Model:</strong> Run <code style={{ backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', padding: '2px 4px', borderRadius: '4px', fontSize: '13px' }}>ollama pull llama3.1</code> or <code style={{ backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', padding: '2px 4px', borderRadius: '4px', fontSize: '13px' }}>ollama pull mistral</code></li>
                <li><strong>Verify:</strong> Ensure Ollama is running on <code style={{ backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', padding: '2px 4px', borderRadius: '4px', fontSize: '13px' }}>localhost:11434</code></li>
              </ol>
              
              <p style={{ 
                fontSize: '14px',
                backgroundColor: theme === 'lunarpunk' ? 'rgba(78, 250, 159, 0.1)' : 'rgba(59, 32, 233, 0.1)',
                padding: '12px',
                borderRadius: '8px',
                border: theme === 'lunarpunk' ? '1px solid rgba(78, 250, 159, 0.3)' : '1px solid rgba(59, 32, 233, 0.3)',
                marginTop: '12px'
              }}>
                💡 <strong>Tip:</strong> Correlate will automatically detect when Ollama is running and use it for AI-powered schema correlation and document processing.
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowAboutDialog(false);
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
    )
  );

  const ResetConfirmationDialog = () => (
    showResetDialog && (
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
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: theme === 'lunarpunk' ? 'rgb(41, 37, 36)' : 'white',
          padding: '32px',
          borderRadius: '16px',
          border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(226, 232, 240)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '400px',
          width: '90%'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              marginBottom: '8px',
              color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)'
            }}>
              Start Over?
            </h3>
            <p style={{ 
              color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(38, 34, 34, 0.7)',
              fontSize: '14px'
            }}>
              You have work in progress. Starting over will reset your current workflow and clear all selections.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleResetCancel();
              }}
              style={{
                flex: 1,
                padding: '12px 24px',
                borderRadius: '8px',
                border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgb(226, 232, 240)',
                backgroundColor: 'transparent',
                color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Stay Here
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleResetConfirm();
              }}
              style={{
                flex: 1,
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, rgb(250, 82, 115), rgb(239, 68, 68))',
                color: 'white',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    )
  );

  const Footer = () => (
    <div style={{
      textAlign: 'center',
      padding: '24px',
      borderTop: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(226, 232, 240)',
      backgroundColor: theme === 'lunarpunk' ? 'rgba(41, 37, 36, 0.6)' : 'rgba(255, 255, 255, 0.6)',
      backdropFilter: 'blur(16px)'
    }}>
      <p style={{ 
        margin: 0,
        fontSize: '14px',
        color: theme === 'lunarpunk' ? 'white' : 'black'
      }}>
        Made with 💙 by the Correlate team
      </p>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: theme === 'lunarpunk' 
        ? 'linear-gradient(135deg, rgb(30, 41, 59), rgb(75, 85, 99))'
        : 'linear-gradient(135deg, rgb(241, 245, 249), rgb(226, 232, 240))',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '24px',
        borderBottom: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(226, 232, 240)',
        backgroundColor: theme === 'lunarpunk' ? 'rgba(41, 37, 36, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div 
            onClick={handleLogoClick}
            style={{ 
              cursor: hasProgress ? 'pointer' : 'default'
            }}
          >
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              backgroundImage: theme === 'lunarpunk'
                ? 'linear-gradient(135deg, rgb(78, 250, 159), rgb(59, 32, 233))'
                : 'linear-gradient(135deg, rgb(59, 32, 233), rgb(78, 250, 159))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0
            }}>
              Correlate
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Header Section - Always Visible */}
          <HeaderSection />

          {/* Tab Navigation */}
          <TabNavigation />

          {/* Loading Indicator */}
          {isLoading && (
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <LoadingIndicator />
            </div>
          )}

          {/* Error Display */}
          {error && <ErrorCard message={error} />}

          {/* Tab Content */}
          {activeTab === 'correlation' ? (
            <SchemaCorrelationContent />
          ) : (
            <VectorStorePanel />
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Dialogs */}
      <AboutDialog />
      <ResetConfirmationDialog />
    </div>
  );
};

export default App; 