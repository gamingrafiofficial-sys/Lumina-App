
import React, { useState } from 'react';
import { Post, User } from '../types';
import { ICONS } from '../constants';
import DeleteConfirmModal from './DeleteConfirmModal';

interface PostCardProps {
  post: Post;
  currentUser: User | null;
  onLike: (postId: string) => void;
  onSave?: (postId: string) => void;
  onComment: (postId: string, text: string) => void;
  onUserClick: (user: User) => void;
  onDelete: (postId: string) => Promise<void>;
  onEdit: (post: Post) => void;
  onOpenComments: (post: Post) => void;
  onPhotoClick?: (post: Post) => void; // Added onPhotoClick prop
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUser, onLike, onSave, onComment, onUserClick, onDelete, onEdit, onOpenComments, onPhotoClick }) => {
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isOwner = currentUser?.id === post.user.id;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onComment(post.id, newComment);
      setNewComment('');
    }
  };

  const isLongCaption = post.caption.length > 95;

  return (
    <article className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 md:border md:rounded-3xl md:mb-8 md:max-w-[470px] md:mx-auto overflow-hidden shadow-sm transition-all duration-300 relative">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => onUserClick(post.user)}>
          <div className="w-10 h-10 rounded-full bg-brand-gradient p-0.5 group-hover:scale-105 transition-transform shadow-md">
            <img src={post.user.avatar} className="w-full h-full rounded-full border-2 border-white dark:border-slate-900 object-cover" />
          </div>
          <span className="font-bold text-sm tracking-tight hover:text-brand-primary dark:hover:text-brand-secondary dark:text-gray-200 transition-colors">{post.user.username}</span>
        </div>
        
        {isOwner && (
          <div className="relative">
            <button 
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
            </button>
            
            {showOptionsMenu && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setShowOptionsMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-[70] py-1 animate-in fade-in zoom-in-95 duration-100">
                  <button 
                    onClick={() => { onEdit(post); setShowOptionsMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center space-x-2"
                  >
                    <span>Edit</span>
                  </button>
                  <button 
                    onClick={() => { setShowDeleteModal(true); setShowOptionsMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                  >
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Caption Section */}
      <div className="px-4 pb-3">
        <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
          <p className={!showFullCaption ? "line-clamp-2" : ""}>
            {post.caption}
          </p>
          {isLongCaption && !showFullCaption && (
            <button 
              onClick={() => setShowFullCaption(true)}
              className="text-gray-400 dark:text-gray-500 font-bold text-xs mt-1 hover:text-brand-primary transition-colors"
            >
              See More
            </button>
          )}
        </div>
      </div>

      {/* Post Image */}
      <div 
        className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-slate-950 cursor-pointer"
        onClick={() => onPhotoClick && onPhotoClick(post)}
      >
        <img 
          src={post.imageUrl} 
          alt="Lumina post" 
          className="w-full h-full object-cover select-none"
          onDoubleClick={(e) => { e.stopPropagation(); onLike(post.id); }}
        />
      </div>

      {/* Post Actions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-5">
            <button onClick={() => onLike(post.id)} className={`transition-transform active:scale-125 ${post.isLiked ? 'text-brand-secondary' : 'text-gray-800 dark:text-gray-200 hover:text-brand-primary'}`}>
              <ICONS.Heart className={`w-7 h-7 ${post.isLiked ? 'fill-current' : ''}`} />
            </button>
            <button onClick={() => onOpenComments(post)} className="text-gray-800 dark:text-gray-200 hover:text-brand-primary transition-colors">
              <ICONS.Comment className="w-7 h-7" />
            </button>
            <button className="text-gray-800 dark:text-gray-200 hover:text-brand-primary transition-colors rotate-[-15deg]"><ICONS.Share className="w-7 h-7" /></button>
          </div>
          <button 
            onClick={() => onSave && onSave(post.id)} 
            className={`transition-all active:scale-125 ${post.isSaved ? 'text-brand-primary dark:text-brand-secondary' : 'text-gray-800 dark:text-gray-200 hover:text-brand-primary'}`}
          >
            <ICONS.Bookmark className={`w-7 h-7 ${post.isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        <p className="font-black text-xs mb-1.5 text-gray-900 dark:text-gray-100 tracking-tight uppercase opacity-60">
          {post.likes.toLocaleString()} people shone light
        </p>

        {/* Quick View Comments Link */}
        {post.comments.length > 0 && (
          <button 
            onClick={() => onOpenComments(post)}
            className="text-gray-400 dark:text-gray-500 text-xs font-bold mt-2 hover:underline"
          >
            View all {post.comments.length} comments
          </button>
        )}

        {/* Quick Comment Input */}
        <form onSubmit={handleCommentSubmit} className="mt-4 flex items-center border-t border-gray-50 dark:border-slate-800 pt-3">
          <input
            type="text"
            placeholder="Add a thought..."
            className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 font-medium dark:text-white"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={!newComment.trim()}
            className="text-brand-primary dark:text-brand-secondary text-sm font-black disabled:opacity-30 ml-3 transition-opacity active:scale-95"
          >
            Post
          </button>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmModal 
          onConfirm={async () => {
            await onDelete(post.id);
            setShowDeleteModal(false);
          }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </article>
  );
};

export default PostCard;
