import React from 'react';
import { useTheme } from '@/components/ThemeProvider/ThemeProvider';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const SunIcon = () => (
    <svg 
      viewBox="0 0 20 20" 
      fill="none" 
      style={{ width: '24px', height: '24px' }}
    >
      {/* Sun */}
      <circle cx="10" cy="10" r="3" fill="currentColor" />
      <path 
        d="M10 1v3m0 12v3m8-8h-3M4 10H1m15.07-5.07l-2.12 2.12M6.34 6.34L4.22 4.22m11.56 11.56l-2.12-2.12M6.34 13.66l-2.12 2.12" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
    </svg>
  );

  const MoonIcon = () => (
    <svg 
      viewBox="0 0 20 20" 
      fill="none" 
      style={{ width: '24px', height: '24px' }}
    >
      {/* Crescent moon */}
      <path 
        d="M17.5 10.5a8 8 0 01-8 8 8 8 0 01-8-8 8 8 0 018-8 6 6 0 000 8z" 
        fill="currentColor" 
      />
    </svg>
  );

  return (
    <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 50 }}>
      <button
        onClick={toggleTheme}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 24px',
          background: theme === 'lunarpunk' 
            ? 'rgba(41, 37, 36, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
          border: theme === 'lunarpunk' 
            ? '1px solid rgba(255, 255, 255, 0.2)' 
            : '1px solid rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          minWidth: '120px',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease'
        }}
        aria-label={`Switch to ${theme === 'solarpunk' ? 'lunarpunk' : 'solarpunk'} mode`}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        }}
      >
        {/* Sun Icon */}
        <div style={{
          color: theme === 'solarpunk' ? '#3b20e9' : 'rgba(128, 128, 128, 0.4)',
          transition: 'all 0.3s ease',
          transform: theme === 'solarpunk' ? 'scale(1.1)' : 'scale(1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <SunIcon />
        </div>
        
        {/* Divider */}
        <div style={{
          width: '1px',
          height: '20px',
          backgroundColor: theme === 'lunarpunk' 
            ? 'rgba(255, 255, 255, 0.3)' 
            : 'rgba(0, 0, 0, 0.2)'
        }}></div>
        
        {/* Moon Icon */}
        <div style={{
          color: theme === 'lunarpunk' ? '#4efa9f' : 'rgba(128, 128, 128, 0.4)',
          transition: 'all 0.3s ease',
          transform: theme === 'lunarpunk' ? 'scale(1.1)' : 'scale(1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <MoonIcon />
        </div>
      </button>
    </div>
  );
}; 