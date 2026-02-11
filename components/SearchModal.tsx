
import React from 'react';
import { User } from '../types';
import { ICONS } from '../constants';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  results: User[];
  isSearching: boolean;
  onSelectUser: (user: User) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  results,
  isSearching,
  onSelectUser,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-start justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg h-full md:h-auto md:max-h-[80vh] md:rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-4 border-b dark:border-slate-800 flex items-center space-x-3 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all">
            <ICONS.ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 relative">
            <ICONS.Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Search name or mobile..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-primary dark:text-white"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-2">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Searching Lumina...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((user) => (
                <div
                  key={user.id}
                  onClick={() => onSelectUser(user)}
                  className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer space-x-4 rounded-[1.5rem] transition-all group"
                >
                  <img src={user.avatar} className="w-12 h-12 rounded-full border border-gray-100 dark:border-slate-700 shadow-sm" />
                  <div className="flex-1">
                    <p className="font-bold text-sm dark:text-white group-hover:text-brand-primary transition-colors">{user.fullName}</p>
                    <p className="text-xs text-gray-400">@{user.username}</p>
                  </div>
                  <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <ICONS.Chat className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.length > 1 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
              <ICONS.Search className="w-12 h-12" />
              <p className="font-bold text-sm">No results found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
              <ICONS.Friends className="w-12 h-12" />
              <p className="font-bold text-sm">Search for friends to start glowing</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
