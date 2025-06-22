import React, { useState } from 'react';
import { TranslationSample } from '@/shared/types/translation';
import { useTheme } from '@/components/ThemeProvider/ThemeProvider';

interface ReviewPanelProps {
  sampleTranslations: TranslationSample[];
  approvedTranslations: TranslationSample[];
  rejectedTranslations: TranslationSample[];
  onApprove: (sample: TranslationSample) => void;
  onReject: (sample: TranslationSample) => void;
  onEdit: (sample: TranslationSample, newValue: string) => void;
}

const ReviewPanel: React.FC<ReviewPanelProps> = ({ 
  sampleTranslations, 
  approvedTranslations, 
  rejectedTranslations, 
  onApprove, 
  onReject, 
  onEdit 
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const { theme } = useTheme();

  const handleEditClick = (index: number, sample: TranslationSample) => {
    setEditingIndex(index);
    setEditValue(sample.translatedTag);
  };

  const handleSaveClick = (sample: TranslationSample) => {
    onEdit(sample, editValue);
    setEditingIndex(null);
  };

  const handleApprove = (sample: TranslationSample) => {
    onApprove(sample);
  };

  const handleReject = (sample: TranslationSample) => {
    onReject(sample);
  };

  const getSampleState = (sample: TranslationSample) => {
    const isApproved = approvedTranslations.some(approved => approved.sourceTag === sample.sourceTag);
    const isRejected = rejectedTranslations.some(rejected => rejected.sourceTag === sample.sourceTag);
    
    if (isApproved) return 'approved';
    if (isRejected) return 'rejected';
    return 'pending';
  };

  const getStateStyles = (state: string) => {
    switch (state) {
      case 'approved':
        return {
          border: '1px solid rgba(34, 197, 94, 0.3)',
          backgroundColor: 'rgba(34, 197, 94, 0.05)'
        };
      case 'rejected':
        return {
          border: '1px solid rgba(250, 82, 115, 0.3)',
          backgroundColor: 'rgba(250, 82, 115, 0.05)'
        };
      default:
        return {
          border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(226, 232, 240)',
          backgroundColor: theme === 'lunarpunk' ? 'rgba(41, 37, 36, 0.8)' : 'rgba(255, 255, 255, 0.8)'
        };
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'approved':
        return (
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg style={{ width: '8px', height: '8px', color: 'rgb(34, 197, 94)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'rejected':
        return (
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: 'rgba(250, 82, 115, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg style={{ width: '8px', height: '8px', color: 'rgb(250, 82, 115)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.1)' : 'rgb(248, 250, 252)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg style={{ 
              width: '8px', 
              height: '8px', 
              color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(113, 113, 122, 1)' 
            }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const TagPill = ({ 
    text, 
    variant = 'default'
  }: { 
    text: string; 
    variant?: 'default' | 'source' | 'target';
  }) => {
    const getVariantStyles = () => {
      switch (variant) {
        case 'source':
          return {
            backgroundColor: theme === 'lunarpunk' ? 'rgba(59, 32, 233, 0.2)' : 'rgba(59, 32, 233, 0.1)',
            color: theme === 'lunarpunk' ? 'rgb(147, 197, 253)' : 'rgb(59, 32, 233)',
            border: theme === 'lunarpunk' ? '1px solid rgba(59, 32, 233, 0.4)' : '1px solid rgba(59, 32, 233, 0.2)'
          };
        case 'target':
          return {
            backgroundColor: theme === 'lunarpunk' ? 'rgba(78, 250, 159, 0.2)' : 'rgba(78, 250, 159, 0.1)',
            color: theme === 'lunarpunk' ? 'rgb(78, 250, 159)' : 'rgb(34, 197, 94)',
            border: theme === 'lunarpunk' ? '1px solid rgba(78, 250, 159, 0.4)' : '1px solid rgba(78, 250, 159, 0.3)'
          };
        default:
          return {
            backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.1)' : 'rgb(248, 250, 252)',
            color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(113, 113, 122, 1)',
            border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgb(226, 232, 240)'
          };
      }
    };

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '500',
        ...getVariantStyles()
      }}>
        {text}
      </span>
    );
  };

  const ArrowIcon = () => (
    <svg style={{ 
      width: '12px', 
      height: '12px',
      color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(113, 113, 122, 1)'
    }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );

  const ActionButton = ({ 
    onClick, 
    variant = 'primary',
    children 
  }: {
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'destructive';
    children: React.ReactNode;
  }) => {
    const getVariantStyles = () => {
      switch (variant) {
        case 'primary':
          return {
            background: theme === 'lunarpunk' 
              ? 'linear-gradient(135deg, rgb(78, 250, 159), rgb(59, 32, 233))'
              : 'rgb(59, 32, 233)',
            color: 'white',
            border: 'none'
          };
        case 'destructive':
          return {
            backgroundColor: 'rgb(250, 82, 115)',
            color: 'white',
            border: 'none'
          };
        case 'secondary':
        default:
          return {
            backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.1)' : 'rgb(248, 250, 252)',
            color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(38, 34, 34, 0.8)',
            border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgb(226, 232, 240)'
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
        style={{
          ...getVariantStyles(),
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        {children}
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {sampleTranslations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px auto',
            borderRadius: '50%',
            backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.1)' : 'rgb(248, 250, 252)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg style={{ 
              width: '32px', 
              height: '32px', 
              color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(113, 113, 122, 1)' 
            }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '500', 
            color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)',
            marginBottom: '8px' 
          }}>No Samples Yet</h3>
          <p style={{ 
            color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(113, 113, 122, 1)'
          }}>Run correlation analysis to generate translation samples for review.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sampleTranslations.map((sample, index) => {
            const state = getSampleState(sample);
            const isEditing = editingIndex === index;

            return (
              <div
                key={index}
                style={{
                  ...getStateStyles(state),
                  borderRadius: '12px',
                  padding: '24px',
                  backdropFilter: 'blur(16px)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* State indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    {getStateIcon(state)}
                    
                    {/* Translation mapping */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                      <TagPill text={sample.sourceTag} variant="source" />
                      <ArrowIcon />
                      
                      {isEditing ? (
                        <div style={{ flex: 1, maxWidth: '300px' }}>
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 12px',
                              fontSize: '14px',
                              border: theme === 'lunarpunk' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgb(226, 232, 240)',
                              borderRadius: '6px',
                              backgroundColor: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.05)' : 'rgb(255, 255, 255)',
                              color: theme === 'lunarpunk' ? 'rgb(255, 255, 255)' : 'rgb(38, 34, 34)',
                              outline: 'none'
                            }}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveClick(sample);
                              if (e.key === 'Escape') setEditingIndex(null);
                            }}
                          />
                        </div>
                      ) : (
                        <TagPill text={sample.translatedTag} variant="target" />
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                    {isEditing ? (
                      <>
                        <ActionButton onClick={() => handleSaveClick(sample)} variant="primary">
                          Save
                        </ActionButton>
                        <ActionButton onClick={() => setEditingIndex(null)} variant="secondary">
                          Cancel
                        </ActionButton>
                      </>
                    ) : state === 'pending' ? (
                      <>
                        <ActionButton onClick={() => handleApprove(sample)} variant="primary">
                          Approve
                        </ActionButton>
                        <ActionButton onClick={() => handleEditClick(index, sample)} variant="secondary">
                          Edit
                        </ActionButton>
                        <ActionButton onClick={() => handleReject(sample)} variant="destructive">
                          Reject
                        </ActionButton>
                      </>
                    ) : (
                      <div style={{ 
                        fontSize: '12px', 
                        fontWeight: '500', 
                        color: theme === 'lunarpunk' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(113, 113, 122, 1)',
                        textTransform: 'capitalize',
                        padding: '6px 12px'
                      }}>
                        {state}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReviewPanel; 