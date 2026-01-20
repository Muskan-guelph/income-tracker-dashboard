import React from 'react';
import { Home, Mail, FileText, Folder, Settings, LayoutDashboard, Receipt } from 'lucide-react';
import { PageType } from '../types';

interface SidebarProps {
  isDarkMode: boolean;
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isDarkMode, currentPage, onNavigate }) => {
  return (
    <aside className={`w-20 h-full flex flex-col items-center py-8 border-r backdrop-blur-xl z-20 transition-colors duration-500 ${isDarkMode
      ? 'border-white/[0.03] bg-[#0c0c12]/40'
      : 'border-slate-200 bg-white/50'
      }`}>
      {/* Logo Placeholder */}
      <div className="mb-12">
        <div className="w-10 h-10 bg-gradient-to-br from-[#2f7bf2] to-[#a855f7] rounded-xl flex items-center justify-center transform shadow-[0_0_25px_rgba(168,85,247,0.3)]">
          <div className="w-5 h-5 bg-white/20 rounded-full backdrop-blur-sm border border-white/20"></div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col space-y-6 w-full items-center">
        <NavItem
          icon={<Home size={20} />}
          active={currentPage === 'home'}
          isDarkMode={isDarkMode}
          onClick={() => onNavigate('home')}
        />
        <NavItem
          icon={<LayoutDashboard size={20} />}
          active={currentPage === 'companies' || currentPage === 'company-details'}
          isDarkMode={isDarkMode}
          onClick={() => onNavigate('companies')}
        />
        <NavItem
          icon={<Receipt size={20} />}
          active={currentPage === 'transactions'}
          isDarkMode={isDarkMode}
          onClick={() => onNavigate('transactions')}
        />
        <NavItem
          icon={<FileText size={20} />}
          active={currentPage === 'reports'}
          isDarkMode={isDarkMode}
          onClick={() => onNavigate('reports')}
        />
        <NavItem icon={<Mail size={20} />} active={false} isDarkMode={isDarkMode} onClick={() => { }} />
      </nav>

      {/* Bottom Settings */}
      <div className="mt-auto">
        <button className={`p-3 rounded-xl transition-all duration-300 ${isDarkMode
          ? 'text-gray-500 hover:text-white hover:bg-white/5'
          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}>
          <Settings size={20} />
        </button>
      </div>
    </aside>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  active?: boolean;
  isDarkMode: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, active, isDarkMode, onClick }) => {
  return (
    <div className="relative group w-full flex justify-center px-4">
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#8b5cf6] rounded-r-full shadow-[0_0_15px_#8b5cf6]" />
      )}
      <button
        onClick={onClick}
        className={`p-3 rounded-xl transition-all duration-300 w-full flex justify-center ${active
          ? isDarkMode
            ? 'text-white bg-gradient-to-b from-white/10 to-transparent shadow-inner border-t border-white/10'
            : 'text-slate-900 bg-white border border-slate-200 shadow-md'
          : isDarkMode
            ? 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
      >
        {icon}
      </button>
    </div>
  );
};

export default Sidebar;