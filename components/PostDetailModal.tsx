
import React, { useState } from 'react';
import { Post, User } from '../types';
import { ICONS } from '../constants';

interface PostDetailModalProps {
  post: Post;
  currentUser: User | null;
  onClose: () => void;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onOpenComments: (post: Post) => void;
}

const PostDetailModal: React.FC<PostDetailModalProps> = ({ post, currentUser, onClose, onLike, onSave, onOpenComments }) => {
  const [showMenu, setShowMenu] = useState(false);

  const downloadImage = async () => {
    try {
      const response = await fetch(post.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lumina_moment_${post.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setShowMenu(false);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[800] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-full md:h-auto md:max-h-[90vh] md:rounded-[3rem] overflow-hidden flex flex-col md:flex-row relative shadow-2xl animate-in zoom-in-95 duration-300">
        
        {/* Close Button Mobile */}
        <button onClick={onClose} className="absolute top-6 left-6 z-[810] md:hidden p-3 bg-black/20 backdrop-blur-md rounded-full text-white">
          <ICONS.ChevronLeft className="w-6 h-6" />
        </button>

        {/* Image Section */}
        <div className="w-full md:w-2/3 bg-black flex items-center justify-center relative group">
          <img src={post.imageUrl} className="w-full h-full object-contain" alt="" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center">
            <button onClick={() => onLike(post.id)} className="p-6 text-white transform hover:scale-125 transition-transform active:scale-90">
               <ICONS.Heart className={`w-16 h-16 ${post.isLiked ? 'fill-current text-brand-secondary' : ''}`} />
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="w-full md:w-1/3 flex flex-col border-l dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="p-6 border-b dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src={post.user.avatar} className="w-10 h-10 rounded-full border-2 border-brand-primary/20" alt="" />
              <div>
                <p className="font-black text-sm">{post.user.username}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{post.timestamp}</p>
              </div>
            </div>
            
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
              </button>
              
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-[820]" onClick={() => setShowMenu(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl shadow-2xl z-[830] py-2 animate-in fade-in zoom-in-95 duration-150">
                    <button onClick={downloadImage} className="w-full text-left px-5 py-3 text-sm font-bold flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-slate-700">
                       <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                       <span>Download Photo</span>
                    </button>
                    <button className="w-full text-left px-5 py-3 text-sm font-bold flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-slate-700 text-red-500">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                       <span>Report Moment</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
            <p className="text-sm font-medium leading-relaxed dark:text-gray-300 mb-8">{post.caption}</p>
            <div className="space-y-4">
               <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Community Thoughts</p>
               {post.comments.length > 0 ? (
                 post.comments.map(c => (
                   <div key={c.id} className="flex space-x-3 text-sm">
                      <span className="font-black flex-none">{c.username}</span>
                      <span className="text-gray-600 dark:text-gray-400">{c.text}</span>
                   </div>
                 ))
               ) : (
                 <p className="text-xs italic text-gray-400">No comments yet. Share your light first.</p>
               )}
            </div>
          </div>

          <div className="p-6 border-t dark:border-slate-800 space-y-4 bg-gray-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <button onClick={() => onLike(post.id)} className="transition-transform active:scale-125">
                  <ICONS.Heart className={`w-8 h-8 ${post.isLiked ? 'fill-current text-brand-secondary' : ''}`} />
                </button>
                <button onClick={() => onOpenComments(post)} className="hover:text-brand-primary">
                  <ICONS.Comment className="w-8 h-8" />
                </button>
                <button className="rotate-[-15deg] hover:text-brand-primary">
                  <ICONS.Share className="w-8 h-8" />
                </button>
              </div>
              <button onClick={() => onSave(post.id)} className="active:scale-125 transition-transform">
                <ICONS.Bookmark className={`w-8 h-8 ${post.isSaved ? 'fill-current text-brand-primary' : ''}`} />
              </button>
            </div>
            <p className="font-black text-sm uppercase tracking-tight">{post.likes.toLocaleString()} Shone Light</p>
          </div>
        </div>

        {/* Desktop Close */}
        <button onClick={onClose} className="hidden md:flex absolute top-6 right-6 p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    </div>
  );
};

export default PostDetailModal;
