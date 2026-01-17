import React from 'react';
import { Plus, LayoutGrid, Settings, FileText, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleTheme }) => {
  return (
    <header className="px-8 py-6 flex items-center justify-between w-full relative z-20">
      
      {/* Left Tabs */}
      <div className={`flex items-center space-x-1 backdrop-blur-md p-1.5 rounded-full border shadow-2xl transition-all duration-300 ${
        isDarkMode 
          ? 'bg-[#1a1a24]/80 border-white/[0.08]' 
          : 'bg-white/80 border-slate-200 shadow-slate-200/50'
      }`}>
        <TabButton active text="Dashboard" icon={<LayoutGrid size={16} />} isDarkMode={isDarkMode} />
        <TabButton text="Reports" icon={<FileText size={16} />} isDarkMode={isDarkMode} />
        <TabButton text="Settings" icon={<Settings size={16} />} isDarkMode={isDarkMode} />
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-4">
        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme}
          className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 shadow-md group ${
            isDarkMode 
              ? 'bg-[#1a1a24] border-white/10 text-gray-400 hover:text-white hover:bg-[#252532]' 
              : 'bg-white border-slate-200 text-slate-500 hover:text-orange-500 hover:bg-slate-50 hover:border-orange-200 shadow-slate-200'
          }`}
          aria-label="Toggle Theme"
        >
          {isDarkMode ? (
            <Sun size={18} className="group-hover:text-yellow-300 transition-colors" />
          ) : (
            <Moon size={18} className="group-hover:text-blue-500 transition-colors" />
          )}
        </button>

        {/* Add Income Button */}
        <button className={`flex items-center space-x-2 px-5 py-2.5 rounded-full border text-sm font-medium transition-all duration-300 group shadow-lg hover:shadow-xl active:scale-95 ${
          isDarkMode
            ? 'bg-[#1a1a24] hover:bg-[#252532] text-gray-200 border-white/10 hover:border-white/20'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 shadow-slate-200'
        }`}>
          <Plus size={16} className={`transition-colors ${isDarkMode ? 'text-gray-400 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
          <span>Add Income</span>
        </button>
        
        {/* Profile Avatar */}
        <div className="relative group cursor-pointer">
             <div className={`w-11 h-11 rounded-full overflow-hidden border-2 transition-all duration-300 p-0.5 shadow-lg ${
                isDarkMode 
                  ? 'border-white/10 group-hover:border-purple-500/50' 
                  : 'border-slate-200 group-hover:border-purple-500/50 shadow-slate-200'
             }`}>
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80" alt="User" className="w-full h-full object-cover rounded-full" />
             </div>
             <div className={`absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 rounded-full shadow-sm ${isDarkMode ? 'border-[#0d0d12]' : 'border-white'}`}></div>
        </div>
      </div>
    </header>
  );
};

const TabButton: React.FC<{ text: string; icon: React.ReactNode; active?: boolean; isDarkMode: boolean }> = ({ text, icon, active, isDarkMode }) => {
  return (
    <button
      className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-medium transition-all duration-300 ${
        active
          ? isDarkMode 
            ? 'bg-[#2a2a35] text-white shadow-lg border border-white/10 translate-y-[1px]' 
            : 'bg-slate-100 text-slate-900 shadow-md border border-slate-200 translate-y-[1px]'
          : isDarkMode 
            ? 'text-gray-500 hover:text-gray-300 hover:bg-[#20202a]' 
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span className={active ? 'text-blue-400' : 'opacity-70'}>{icon}</span>
      <span>{text}</span>
    </button>
  );
};

export default Header;