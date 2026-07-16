import React from 'react';
import { Menu, Sun, Moon, Bell } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials } from '../../utils/helpers';

import { Link } from 'react-router-dom';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onMenuToggle }) => {
  const { isDark, toggle } = useTheme();
  const { user } = useAuth();
  
  const dashboardPath = user?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center px-6 md:px-8 bg-[var(--brand-surface)]/80 dark:bg-[#0B0F19]/80 backdrop-blur-md">
      {/* Desktop click logo */}
      <Link to={dashboardPath} className="hidden lg:flex items-center gap-2 mr-4 hover:opacity-90 transition-opacity shrink-0">
        <img src="/xebia_logo.png" alt="Xebia" className="h-6 w-auto object-contain" />
      </Link>

      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden mr-3 p-2 rounded-xl text-[var(--text-secondary)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <Menu size={20} />
      </button>

      {/* Mobile click logo */}
      <Link to={dashboardPath} className="lg:hidden flex items-center gap-2 mr-3 hover:opacity-90 transition-opacity shrink-0">
        <img src="/xebia_logo.png" alt="Xebia" className="h-5 w-auto object-contain" />
      </Link>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-[var(--text-primary)] truncate">{title}</h1>
        {subtitle && <p className="text-xs text-[var(--text-secondary)] truncate">{subtitle}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notification bell (decorative) */}
        <button className="relative p-2 rounded-xl text-[var(--text-secondary)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#4A1F4F]" />
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="p-2 rounded-xl text-[var(--text-secondary)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-[var(--brand-border)]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A1F4F] to-[#622865] flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {user ? getInitials(user.name) : '?'}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-medium text-[var(--text-primary)] leading-none">{user?.name}</p>
            <p className="text-[10px] text-[var(--text-secondary)] capitalize mt-0.5">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
