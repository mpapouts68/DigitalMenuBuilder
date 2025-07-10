import React from 'react';

interface DebugCategoryButtonProps {
  children: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

export function DebugCategoryButton({ children, isActive, onClick }: DebugCategoryButtonProps) {
  const buttonStyle = {
    padding: '12px 20px',
    borderRadius: '9999px',
    fontSize: '14px',
    fontWeight: '600' as const,
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.2s',
    cursor: 'pointer' as const,
    outline: 'none',
    ...(isActive ? {
      backgroundColor: '#2563eb',
      color: '#ffffff',
      boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)',
      transform: 'scale(1.05)'
    } : {
      backgroundColor: '#ffffff',
      color: '#000000',
      border: '2px solid #000000',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    })
  };

  return (
    <button
      onClick={onClick}
      style={buttonStyle}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.target as HTMLElement).style.backgroundColor = '#ffffff';
        }
      }}
    >
      {children}
    </button>
  );
}