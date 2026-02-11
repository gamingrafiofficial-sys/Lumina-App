
import React, { useState, useEffect, useRef } from 'react';
import { Post, User, Comment } from '../types';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';

interface CommentPageProps {
  post: Post;
  currentUser: User | null;
  onClose: () => void;
  onAddComment: (postId: string, text: string) => Promise<void>;
}

const CommentPage: React.FC<CommentPageProps> = ({ post, currentUser, onClose, onAddComment }) => {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch comments from database on mount
  useEffect(() => {
    fetchLatestComments();
  }, [post.id]);

  const fetchLatestComments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(username, avatar_url)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        const mappedComments: Comment[] = data.map(c => ({
          id: c.id,
          username: c.profiles.username,
          text: c.text,
          timestamp: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setComments(mappedComments);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setIsLoading(false);
      // Scroll to bottom after loading
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser || isSubmitting) return;

    setIsSubmitting(true);
    const tempText = commentText;
    setCommentText(''); // Clear input early for better UX

    try {
      await onAddComment(post.id, tempText);
      // Manually add to local list for instant feedback
      const newComment: Comment = {
        id: Math.random().toString(),
        username: currentUser.username,
        text: tempText,
        timestamp: 'Just now'
      };
      setComments(prev => [...prev, newComment]);
      
      // Re-fetch to sync with server IDs and timestamps
      setTimeout(() => fetchLatestComments(), 1000);
      
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error("Failed to add comment:", error);
      setCommentText(tempText); // Restore text if failed
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[550] bg-white dark:bg-slate-950 flex flex-col animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all">
          <ICONS.ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h2 className="font-black text-sm uppercase tracking-widest text-gray-400">Comments</h2>
          <p className="text-[10px] font-bold text-brand-primary">Lumina Community</p>
        </div>
        <div className="w-10"></div>
      </header>

      {/* Comment List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {/* Post Owner's Caption */}
        <div className="flex space-x-3 mb-8">
          <div className="w-9 h-9 rounded-full bg-brand-gradient p-0.5 flex-none">
             <img src={post.user.avatar} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-900" />
          </div>
          <div className="space-y-1 flex-1">
            <p className="text-sm">
              <span className="font-black mr-2 text-gray-900 dark:text-gray-100">{post.user.username}</span>
              <span className="text-gray-800 dark:text-gray-300 font-medium leading-relaxed">{post.caption}</span>
            </p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{post.timestamp}</p>
          </div>
        </div>

        <div className="border-t border-gray-50 dark:border-slate-900 pt-6">
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex space-x-3 animate-pulse">
                  <div className="w-9 h-9 bg-gray-100 dark:bg-slate-800 rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-50 dark:bg-slate-900 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-800 flex-none overflow-hidden">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.username}`} 
                      className="w-full h-full object-cover" 
                      alt={comment.username}
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="text-sm">
                      <span className="font-black mr-2 text-gray-900 dark:text-gray-100">{comment.username}</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{comment.text}</span>
                    </p>
                    <div className="flex items-center space-x-4">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{comment.timestamp}</p>
                      <button className="text-[10px] font-black text-gray-400 hover:text-brand-primary uppercase">Reply</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-4 opacity-30">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                <ICONS.Comment className="w-8 h-8" />
              </div>
              <div>
                <p className="font-black text-sm uppercase tracking-widest">No thoughts yet</p>
                <p className="text-xs mt-1">Be the first to shine light on this moment.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Input */}
      <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-brand-gradient p-0.5 flex-none shadow-md">
            <img src={currentUser?.avatar} className="w-full h-full rounded-full border-2 border-white dark:border-slate-900" />
          </div>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={`Add a comment for ${post.user.username}...`}
              className="w-full bg-gray-100 dark:bg-slate-800 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all dark:text-white font-medium border-none shadow-inner"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <button
            type="submit"
            disabled={!commentText.trim() || isSubmitting}
            className="bg-brand-primary text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-30 transition-all shadow-lg active:scale-95"
          >
            {isSubmitting ? '...' : 'Post'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CommentPage;
