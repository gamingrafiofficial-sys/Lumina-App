
import React from 'react';
import { ICONS } from '../constants';
import { User } from '../types';

interface NavbarProps {
  onTabChange: (tab: string) => void;
  activeTab: string;
  hiddenOnMobile?: boolean;
  currentUser: User | null;
}

const Navbar: React.FC<NavbarProps> = ({ onTabChange, activeTab, hiddenOnMobile, currentUser }) => {
  const navItems = [
    { id: 'home', icon: ICONS.Home },
    { id: 'friends', icon: ICONS.Friends },
    { id: 'create', icon: ICONS.Create },
    { id: 'chat', icon: ICONS.Chat },
    { id: 'profile', icon: 'avatar' },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 z-[100] transition-colors duration-300 ${hiddenOnMobile ? 'hidden' : 'md:hidden'} animate-in slide-in-from-bottom duration-300`}>
      <div className="flex w-full justify-around items-end px-2 pb-[calc(12px+env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          
          if (item.id === 'create') {
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="relative -top-5 flex flex-col items-center justify-center transition-all duration-300 active:scale-90 group"
                aria-label="Create Post"
              >
                <div className="w-16 h-16 bg-brand-gradient rounded-[22px] flex items-center justify-center shadow-[0_8px_20px_rgba(0,103,71,0.3)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.5)] group-hover:shadow-[0_12px_25px_rgba(0,103,71,0.4)] transform group-hover:-translate-y-1 transition-all border-4 border-white dark:border-slate-900">
                  <ICONS.Create 
                    className="w-8 h-8 text-white" 
                  />
                </div>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-3 px-4 transition-all duration-200 active:scale-90 ${isActive ? 'text-brand-primary dark:text-brand-secondary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
              aria-label={item.id}
            >
              {item.id === 'profile' ? (
                <div className={`p-0.5 rounded-full border-2 transition-all duration-300 ${isActive ? 'border-brand-primary dark:border-brand-secondary scale-110 shadow-sm' : 'border-transparent'}`}>
                  <img 
                    src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username || 'default'}`} 
                    alt="Profile" 
                    className="w-7 h-7 rounded-full object-cover bg-gray-100 dark:bg-slate-800 shadow-sm ring-1 ring-gray-100 dark:ring-slate-700" 
                    loading="lazy"
                  />
                </div>
              ) : (
                typeof item.icon === 'function' && (
                  <item.icon 
                    className={`w-7 h-7 transition-all duration-300 ${isActive ? 'scale-110 text-brand-primary dark:text-brand-secondary' : 'text-gray-400 dark:text-gray-500'}`} 
                    fill={isActive ? "currentColor" : "none"}
                    fillOpacity={isActive ? 0.2 : 0}
                  />
                )
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navbar;
