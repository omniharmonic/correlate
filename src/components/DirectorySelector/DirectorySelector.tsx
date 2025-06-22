import React from 'react';
import { useAppStore } from '@/store';
import { useTheme } from '@/components/ThemeProvider/ThemeProvider';

const DirectorySelector: React.FC = () => {
  const { sourcePath, targetPath, setSourcePath, setTargetPath } = useAppStore();
  const { theme } = useTheme();

  const handleSelectSource = async () => {
    const path = await window.correlateAPI.selectDirectory();
    setSourcePath(path);
  };

  const handleSelectTarget = async () => {
    const path = await window.correlateAPI.selectDirectory();
    setTargetPath(path);
  };

  const PathCard = ({ 
    title, 
    description, 
    path, 
    onSelect, 
    icon 
  }: {
    title: string;
    description: string;
    path: string | null;
    onSelect: () => void;
    icon: React.ReactNode;
  }) => (
    <div style={{
      padding: '32px',
      borderRadius: '16px',
      border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(226, 232, 240)',
      backgroundColor: theme === 'lunarpunk' ? 'rgba(41, 37, 36, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(16px)',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: theme === 'lunarpunk' 
              ? 'rgba(78, 250, 159, 0.2)' 
              : 'rgba(59, 32, 233, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme === 'lunarpunk' ? 'rgb(78, 250, 159)' : 'rgb(59, 32, 233)'
          }}>
            {icon}
          </div>
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            fontWeight: '600', 
            fontSize: '18px', 
            marginBottom: '8px',
            color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)'
          }}>
            {title}
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(38, 34, 34, 0.7)',
            marginBottom: '16px'
          }}>
            {description}
          </p>
        </div>

        {path ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                color: 'rgb(34, 197, 94)',
                marginBottom: '4px'
              }}>
                <svg 
                  style={{ width: '12px', height: '12px' }}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Selected</span>
              </div>
              <p style={{ 
                fontSize: '12px', 
                color: 'rgba(34, 197, 94, 0.8)',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                margin: 0
              }}>
                {path.split('/').slice(-2).join('/')}
              </p>
            </div>
            
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect();
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgb(226, 232, 240)',
                backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.1)' : 'rgb(248, 250, 252)',
                color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Change Selection
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect();
            }}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: '8px',
              border: 'none',
              background: theme === 'lunarpunk' 
                ? 'linear-gradient(135deg, rgb(78, 250, 159), rgb(59, 32, 233))'
                : 'rgb(59, 32, 233)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Browse Folders
          </button>
        )}
      </div>
    </div>
  );

  const SourceIcon = () => (
    <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
    </svg>
  );

  const TargetIcon = () => (
    <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
    </svg>
  );

  return (
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
        }}>
          Select Libraries
        </h2>
        <p style={{ 
          color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(38, 34, 34, 0.7)'
        }}>
          Choose your source and target directories to begin correlation
        </p>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px'
      }}>
        <PathCard
          title="Source Library"
          description="The knowledge library you want to translate from"
          path={sourcePath}
          onSelect={handleSelectSource}
          icon={<SourceIcon />}
        />
        
        <PathCard
          title="Target Library"
          description="The destination library structure you want to translate to"
          path={targetPath}
          onSelect={handleSelectTarget}
          icon={<TargetIcon />}
        />
      </div>
    </div>
  );
};

export default DirectorySelector; 