import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        fixed top-4 right-4 z-50
        w-10 h-10
        rounded-full
        flex items-center justify-center
        transition-all duration-300 ease-in-out
        ${isDark 
          ? 'bg-[var(--bg-secondary)] text-yellow-400 hover:bg-[var(--hover-bg)] border border-[var(--border-color)]' 
          : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] border border-[var(--border-color)] shadow-md'
        }
        ${className}
      `}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
};

export default ThemeToggle;
