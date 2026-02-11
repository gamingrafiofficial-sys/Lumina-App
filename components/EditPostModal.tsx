
import React, { useState } from 'react';
import { Post } from '../types';
import { ICONS } from '../constants';
import { generateCaption } from '../services/geminiService';

interface EditPostModalProps {
  post: Post;
  onClose: () => void;
  onUpdate: (postId: string, newCaption: string) => Promise<void>;
}

const EditPostModal: React.FC<EditPostModalProps> = ({ post, onClose, onUpdate }) => {
  const [caption, setCaption] = useState(post.caption);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSuggestCaption = async () => {
    setIsGenerating(true);
    const suggested = await generateCaption(post.imageUrl, caption);
    setCaption(suggested);
    setIsGenerating(false);
  };

  const handleSubmit = async () => {
    if (!caption.trim()) return;
    
    setIsUpdating(true);
    try {
      await onUpdate(post.id, caption);
      onClose();
    } catch (error) {
      console.error("Failed to update post:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-300 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-50 dark:border-slate-800">
          <button 
            onClick={onClose} 
            disabled={isUpdating}
            className="text-sm font-bold text-gray-400 dark:text-gray-500 hover:text-gray-600 px-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 tracking-tight">Edit Post</h2>
          <button 
            onClick={handleSubmit} 
            disabled={isUpdating || caption === post.caption}
            className="text-sm font-bold text-brand-primary dark:text-brand-secondary px-2 hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {isUpdating ? 'Updating...' : 'Update'}
          </button>
        </div>

        <div className="p-7">
          <div className="space-y-5">
            <div className="aspect-square bg-gray-50 dark:bg-slate-950 rounded-[1.5rem] overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm">
              <img src={post.imageUrl} className="w-full h-full object-cover grayscale-[20%]" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Retell your story</label>
                <button 
                  onClick={handleSuggestCaption}
                  disabled={isGenerating || isUpdating}
                  className="text-xs font-bold text-brand-primary dark:text-brand-secondary flex items-center space-x-1.5 hover:brightness-90 transition-all disabled:opacity-50"
                >
                  <ICONS.Magic className="w-4 h-4" />
                  <span>AI Rewrite</span>
                </button>
              </div>
              <textarea
                placeholder="Update your story..."
                className="w-full p-5 bg-gray-50 dark:bg-slate-800 dark:text-white border border-gray-100 dark:border-slate-700 rounded-[1.5rem] text-sm h-36 focus:ring-2 focus:ring-brand-primary focus:outline-none transition-all placeholder:text-gray-300 font-medium leading-relaxed"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={isUpdating}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPostModal;
