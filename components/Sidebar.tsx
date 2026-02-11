
import React from 'react';
import { User } from '../types';
import { ICONS } from '../constants';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
  onThemeToggle: () => void;
  onSavedClick: () => void;
  currentTheme: 'light' | 'dark';
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user, onLogout, onThemeToggle, onSavedClick, currentTheme }) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-[400] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`fixed top-0 left-0 bottom-0 z-[401] w-[280px] bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header/User Profile */}
        <div className="p-8 pt-12 border-b border-gray-50 dark:border-slate-800 bg-brand-gradient">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 rounded-3xl border-4 border-white/30 p-0.5 overflow-hidden shadow-xl">
              <img src={user.avatar} className="w-full h-full object-cover rounded-[1.2rem]" alt={user.username} />
            </div>
            <div>
              <h3 className="text-white font-black text-lg tracking-tight leading-tight">{user.username}</h3>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Active Member</p>
            </div>
          </div>
          <p className="text-white/80 text-xs font-medium line-clamp-2 italic">
            {user.bio || "Sharing light through moments..."}
          </p>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-6 px-4 no-scrollbar">
          <div className="space-y-1">
            <h4 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">Moments</h4>
            <div onClick={onSavedClick}>
              <MenuItem icon={<ICONS.Bookmark className="w-5 h-5" />} label="Saved" />
            </div>
            <MenuItem icon={<ICONS.Magic className="w-5 h-5" />} label="AI Creations" />
            <MenuItem icon={<ICONS.Heart className="w-5 h-5" />} label="Interactions" />
          </div>

          <div className="mt-8 space-y-1">
            <h4 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">Settings</h4>
            <div 
              onClick={onThemeToggle}
              className="flex items-center space-x-4 px-4 py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group"
            >
              <div className="text-gray-400 dark:text-gray-500 group-hover:text-brand-primary transition-colors">
                {currentTheme === 'light' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                ) : (
                  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8a4 4 0 100 8 4 4 0 000-8z"></path></svg>
                )}
              </div>
              <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{currentTheme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <MenuItem icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>} label="Preferences" />
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-50 dark:border-slate-800">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 py-4 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-2xl font-black text-sm hover:bg-red-100 transition-colors shadow-sm active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            <span>Sign Out</span>
          </button>
          <p className="text-center text-[8px] text-gray-300 dark:text-gray-600 font-bold uppercase tracking-widest mt-6">Lumina v2.0 • Made with Light</p>
        </div>
      </div>
    </>
  );
};

const MenuItem: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center space-x-4 px-4 py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group">
    <div className="text-gray-400 dark:text-gray-500 group-hover:text-brand-primary transition-colors">
      {icon}
    </div>
    <span className="font-bold text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{label}</span>
  </div>
);

export default Sidebar;
