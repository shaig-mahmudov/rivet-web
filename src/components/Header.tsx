import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user } = useAuth();

  return (
    <header className="header">
      <div className="header-left">
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {title}
        </h1>
      </div>

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            fontSize: '0.85rem', 
            color: 'var(--color-accent)',
            backgroundColor: 'rgba(6, 182, 212, 0.08)',
            padding: '0.4rem 0.8rem',
            borderRadius: '20px',
            border: '1px solid rgba(6, 182, 212, 0.15)'
          }}
        >
          <Sparkles size={14} />
          <span>API Connected</span>
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Logged in as <strong style={{ color: 'var(--text-primary)' }}>{user.username}</strong>
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
