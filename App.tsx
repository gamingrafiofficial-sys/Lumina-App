
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import PostCard from './components/PostCard';
import PostDetailModal from './components/PostDetailModal';
import CreatePostModal from './components/CreatePostModal';
import EditPostModal from './components/EditPostModal';
import EditProfileModal from './components/EditProfileModal';
import CreateStoryModal from './components/CreateStoryModal';
import StoryViewer from './components/StoryViewer';
import CommentPage from './components/CommentPage';
import { ICONS } from './constants';
import { Post, User, Comment, Story } from './types';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('lumina_theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  const [isRegistering, setIsRegistering] = useState(false);
  const [authFormData, setAuthFormData] = useState({
    fullName: '',
    mobile: '',
    dob: '',
    password: '',
    confirmPassword: ''
  });
  const [authError, setAuthError] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const [activeTab, setActiveTab] = useState('home');
  const [posts, setPosts] = useState<Post[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [viewingCommentsPost, setViewingCommentsPost] = useState<Post | null>(null);
  const [selectedPostDetail, setSelectedPostDetail] = useState<Post | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  
  const [selectedChatUser, setSelectedChatUser] = useState<User | null>(null);
  const [chatMessages, setChatMessages] = useState<{id: string, sender_id: string, text: string, created_at: string}[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [conversations, setConversations] = useState<User[]>([]);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);

  const STORY_TTL = 24 * 60 * 60 * 1000;

  // Initialize App
  useEffect(() => {
    const init = async () => {
      // Splash screen minimum 1s
      const timer = setTimeout(() => setSessionLoading(false), 1000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (e) {
        console.error("Initial session check failed", e);
      }
      
      return () => clearTimeout(timer);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // Timeout the database call after 3 seconds to prevent UI hang
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );

      const result: any = await Promise.race([profilePromise, timeoutPromise]);
      const { data, error } = result;

      if (error || !data) {
        // Safe Fallback: User exists in Auth but not in Profiles table yet
        setCurrentUser({
          id: userId,
          username: `user_${userId.substring(0, 5)}`,
          fullName: authFormData.fullName || 'Lumina Explorer',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          bio: "Shining on Lumina ✨"
        });
        return;
      }
      
      setCurrentUser({
        id: data.id, 
        username: data.username, 
        fullName: data.full_name,
        mobile: data.mobile,
        avatar: data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`,
        coverPhoto: data.cover_photo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
        bio: data.bio || "Sharing light on Lumina ✨",
        work: data.work, 
        location: data.location, 
        website: data.website
      });
    } catch (err) {
      // Ultimate Fallback
      setCurrentUser({
        id: userId,
        username: `user_${userId.substring(0, 5)}`,
        fullName: 'Lumina User',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      });
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmittingAuth(true);

    const sanitizedMobile = authFormData.mobile.trim().replace(/[^0-9]/g, '');
    if (sanitizedMobile.length < 10) {
      setAuthError("Please enter a valid mobile number.");
      setIsSubmittingAuth(false);
      return;
    }
    
    const proxyEmail = `${sanitizedMobile}@lumina.app`;

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({ 
          email: proxyEmail, 
          password: authFormData.password,
          options: { data: { full_name: authFormData.fullName } }
        });
        
        if (error) throw error;
        
        if (data.user) {
          const username = authFormData.fullName.toLowerCase().replace(/\s+/g, '_') + Math.floor(Math.random() * 100);
          // Attempt to create profile, but don't hang if it fails
          await supabase.from('profiles').insert({
            id: data.user.id, 
            username, 
            full_name: authFormData.fullName, 
            mobile: sanitizedMobile,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
          }).select();
          
          await fetchProfile(data.user.id);
          triggerTransition();
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email: proxyEmail, 
          password: authFormData.password 
        });
        
        if (error) {
          if (error.message.includes('confirm')) {
            throw new Error("Login failed. Check your credentials or contact support.");
          }
          throw error;
        }

        if (data.user) {
          await fetchProfile(data.user.id);
          triggerTransition();
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setAuthError(err.message || "Connection failed. Please try again.");
      setIsSubmittingAuth(false);
    }
  };

  const triggerTransition = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab('home');
      setIsSubmittingAuth(false);
      setIsTransitioning(false);
    }, 1000);
  };

  // Sync Database
  useEffect(() => {
    if (currentUser) {
      fetchPosts();
      fetchStories();
      fetchCommunityUsers();
      fetchConversations();
    }
  }, [currentUser]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase.from('posts').select('*, profiles(*)').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const savedIds = JSON.parse(localStorage.getItem(`lumina_saved_${currentUser?.id}`) || '[]');
        const { data: userLikes } = await supabase.from('post_likes').select('post_id').eq('user_id', currentUser?.id);
        const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);
        
        setPosts(data.map(p => ({
          id: p.id, 
          user: { 
            id: p.profiles?.id || '', 
            username: p.profiles?.username || 'user', 
            fullName: p.profiles?.full_name || 'Lumina User', 
            avatar: p.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.profiles?.username || p.id}` 
          },
          imageUrl: p.image_url, 
          caption: p.caption, 
          likes: p.likes_count || 0, 
          isLiked: likedPostIds.has(p.id), 
          isSaved: savedIds.includes(p.id), 
          timestamp: new Date(p.created_at).toLocaleDateString(),
          comments: []
        })));
      }
    } catch (e) {
      console.error("Posts fetch failed", e);
    }
  };

  const fetchStories = async () => {
    const expiryTime = new Date(Date.now() - STORY_TTL).toISOString();
    const { data } = await supabase.from('stories').select('*, profiles(*)').gt('created_at', expiryTime).order('created_at', { ascending: false });
    if (data) {
      setStories(data.map(s => ({
        id: s.id, imageUrl: s.image_url, viewed: false, createdAt: new Date(s.created_at).getTime(),
        user: { id: s.profiles?.id, username: s.profiles?.username, avatar: s.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.profiles?.username}`, fullName: s.profiles?.full_name }
      })));
    }
  };

  const fetchCommunityUsers = async () => {
    if (!currentUser) return;
    const { data } = await supabase.from('profiles').select('*').neq('id', currentUser.id).limit(10);
    if (data) setAllUsers(data.map(u => ({ id: u.id, username: u.username, fullName: u.full_name, avatar: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}` })));
  };

  const fetchConversations = async () => {
    if (!currentUser) return;
    const { data } = await supabase.from('messages').select('sender_id, receiver_id').or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`).order('created_at', { ascending: false });
    if (data) {
      const ids = Array.from(new Set(data.flatMap(m => [m.sender_id, m.receiver_id]).filter(id => id !== currentUser.id)));
      if (ids.length > 0) {
        const { data: p } = await supabase.from('profiles').select('*').in('id', ids);
        if (p) setConversations(p.map(u => ({ id: u.id, username: u.username, fullName: u.full_name, avatar: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}` })));
      }
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const isLiked = !post.isLiked;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked, likes: isLiked ? p.likes + 1 : p.likes - 1 } : p));
    if (isLiked) await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUser.id });
    else await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
  };

  const handlePostStory = async (imageUrl: string) => {
    if (!currentUser) return;
    try {
      await supabase.from('stories').insert({ user_id: currentUser.id, image_url: imageUrl });
      await fetchStories();
    } catch (e) { console.error(e); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setShowMenu(false);
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'create') setShowCreateModal(true);
    else { setActiveTab(tab); if (tab !== 'chat') setSelectedChatUser(null); }
  };

  if (sessionLoading || isTransitioning) return (
    <div className="fixed inset-0 bg-white dark:bg-slate-950 flex flex-col items-center justify-center z-[500]">
      <div className="flex flex-col items-center animate-in zoom-in-95 duration-500">
        <h1 className="brand-font text-8xl font-bold brand-text-gradient animate-pulse-fast">Lumina</h1>
        <div className="mt-8 flex items-center space-x-2">
          <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
          <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
        </div>
      </div>
    </div>
  );

  if (!currentUser) return (
    <div className="h-full bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-md space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 py-12">
        <h1 className="brand-font text-7xl font-bold brand-text-gradient text-center">Lumina</h1>
        
        {authError && (
          <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-5 rounded-3xl text-sm font-bold border border-red-100 dark:border-red-900/30 animate-in shake-in">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {isRegistering && (
            <input type="text" placeholder="Full Name" required className="w-full px-6 py-5 bg-gray-50 dark:bg-slate-900 border dark:border-slate-800 rounded-3xl outline-none focus:ring-2 focus:ring-brand-primary/20 dark:text-white" value={authFormData.fullName} onChange={(e) => setAuthFormData({...authFormData, fullName: e.target.value})} />
          )}
          <input type="tel" placeholder="Mobile Number" required className="w-full px-6 py-5 bg-gray-50 dark:bg-slate-900 border dark:border-slate-800 rounded-3xl outline-none focus:ring-2 focus:ring-brand-primary/20 dark:text-white" value={authFormData.mobile} onChange={(e) => setAuthFormData({...authFormData, mobile: e.target.value})} />
          <input type="password" placeholder="Password" required className="w-full px-6 py-5 bg-gray-50 dark:bg-slate-900 border dark:border-slate-800 rounded-3xl outline-none focus:ring-2 focus:ring-brand-primary/20 dark:text-white" value={authFormData.password} onChange={(e) => setAuthFormData({...authFormData, password: e.target.value})} />
          
          <button type="submit" disabled={isSubmittingAuth} className="w-full bg-brand-gradient text-white py-5 rounded-3xl font-black shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center space-x-2">
            {isSubmittingAuth ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Shining...</span>
              </>
            ) : (isRegistering ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <button onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }} className="w-full text-center text-sm font-black text-brand-primary uppercase tracking-widest">
          {isRegistering ? 'Already a member? Login' : "New to Lumina? Join the glow"}
        </button>
      </div>
    </div>
  );

  return (
    <Router>
      <div className="h-full flex flex-col md:flex-row bg-white dark:bg-slate-950 overflow-hidden text-gray-900 dark:text-gray-100">
        <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-900 border-r dark:border-slate-800 p-6 h-screen sticky top-0">
          <h1 className="brand-font text-4xl font-bold brand-text-gradient mb-12 cursor-pointer" onClick={() => handleTabChange('home')}>Lumina</h1>
          <nav className="flex-1 space-y-2">
             <button onClick={() => handleTabChange('home')} className={`w-full flex items-center space-x-4 p-4 rounded-2xl ${activeTab === 'home' ? 'bg-brand-primary/10 text-brand-primary' : ''}`}><ICONS.Home className="w-6 h-6" /><span>Home</span></button>
             <button onClick={() => handleTabChange('chat')} className={`w-full flex items-center space-x-4 p-4 rounded-2xl ${activeTab === 'chat' ? 'bg-brand-primary/10 text-brand-primary' : ''}`}><ICONS.Chat className="w-6 h-6" /><span>Messages</span></button>
             <button onClick={() => handleTabChange('friends')} className={`w-full flex items-center space-x-4 p-4 rounded-2xl ${activeTab === 'friends' ? 'bg-brand-primary/10 text-brand-primary' : ''}`}><ICONS.Friends className="w-6 h-6" /><span>Community</span></button>
             <button onClick={() => handleTabChange('profile')} className={`w-full flex items-center space-x-4 p-4 rounded-2xl ${activeTab === 'profile' ? 'bg-brand-primary/10 text-brand-primary' : ''}`}><img src={currentUser.avatar} className="w-6 h-6 rounded-full" /><span>Profile</span></button>
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          <header className={`${(activeTab === 'chat') ? 'hidden md:flex' : 'flex'} flex-none bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-4 pt-4 pb-3 items-center justify-between sticky top-0 z-50 md:hidden`}>
            <button onClick={() => setShowMenu(true)} className="p-2"><ICONS.Menu className="w-6 h-6" /></button>
            <h1 className="brand-font text-3xl font-bold brand-text-gradient">Lumina</h1>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 text-brand-primary"><ICONS.Magic className="w-6 h-6" /></button>
          </header>

          <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
            <div className={`w-full mx-auto p-0 ${activeTab === 'chat' ? 'h-full' : 'max-w-[1200px] md:p-8'}`}>
              {activeTab === 'home' && (
                <div className="space-y-8 animate-in fade-in duration-700">
                  <div className="flex space-x-4 overflow-x-auto no-scrollbar py-6 px-4">
                    <div onClick={() => setShowCreateStoryModal(true)} className="flex flex-col items-center space-y-2 cursor-pointer min-w-[85px]">
                      <div className="relative w-[75px] h-[75px]">
                        <img src={currentUser.avatar} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-900" />
                        <div className="absolute bottom-0 right-0 bg-brand-secondary text-white rounded-full p-1 border-2 border-white dark:border-slate-900"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4v16m8-8H4"></path></svg></div>
                      </div>
                      <span className="text-[10px] font-black uppercase text-gray-400">Your Story</span>
                    </div>
                    {stories.map(s => (
                      <div key={s.id} onClick={() => setActiveStory(s)} className="flex flex-col items-center space-y-2 cursor-pointer min-w-[85px]">
                        <div className="w-[75px] h-[75px] rounded-full story-ring"><img src={s.user.avatar} className="w-full h-full rounded-full border-2 border-white dark:border-slate-900 object-cover bg-white" /></div>
                        <span className="text-[10px] font-black truncate w-full text-center uppercase text-gray-600 dark:text-gray-300">{s.user.username}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-6 flex flex-col items-center pb-24">
                    {posts.length > 0 ? (
                      posts.map(post => <PostCard key={post.id} post={post} currentUser={currentUser} onLike={handleLike} onSave={() => {}} onComment={() => setViewingCommentsPost(post)} onUserClick={() => {}} onDelete={fetchPosts} onEdit={() => {}} onOpenComments={setViewingCommentsPost} onPhotoClick={setSelectedPostDetail} />)
                    ) : (
                      <div className="py-20 text-center opacity-40 flex flex-col items-center space-y-4">
                        <ICONS.Create className="w-16 h-16" />
                        <p className="font-bold">No posts to show yet. Be the first!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'friends' && (
                <div className="p-4 md:p-0 space-y-8 animate-in fade-in duration-500">
                  <h2 className="text-4xl font-black tracking-tighter">Community</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
                    {allUsers.map(user => (
                      <div key={user.id} className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[2.5rem] p-6 shadow-sm flex flex-col items-center text-center">
                        <img src={user.avatar} className="w-20 h-20 rounded-full mb-4 object-cover" />
                        <h3 className="font-black text-lg">{user.fullName}</h3>
                        <p className="text-brand-primary font-bold text-xs mb-4">@{user.username}</p>
                        <button onClick={() => {}} className="w-full py-3 bg-brand-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">Follow</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'profile' && currentUser && (
                <div className="bg-white dark:bg-slate-900 md:rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in duration-500">
                  <div className="h-48 md:h-64 relative bg-brand-primary/10"><img src={currentUser.coverPhoto} className="w-full h-full object-cover" /></div>
                  <div className="px-6 md:px-12 pb-24 -mt-16 relative z-10">
                    <img src={currentUser.avatar} className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-8 border-white dark:border-slate-900 shadow-2xl object-cover bg-white mb-6" />
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
                       <div>
                          <h2 className="text-4xl font-black tracking-tighter mb-1">{currentUser.fullName}</h2>
                          <p className="text-brand-primary font-black uppercase tracking-widest text-sm">@{currentUser.username}</p>
                       </div>
                       <button onClick={() => setShowEditProfileModal(true)} className="mt-6 md:mt-0 px-8 py-3.5 bg-brand-gradient text-white rounded-2xl font-black text-sm shadow-xl">Edit Identity</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {posts.filter(p => p.user.id === currentUser.id).map(p => (
                        <div key={p.id} onClick={() => setSelectedPostDetail(p)} className="aspect-square rounded-2xl overflow-hidden cursor-pointer border dark:border-slate-800"><img src={p.imageUrl} className="w-full h-full object-cover" /></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
          
          <Navbar onTabChange={handleTabChange} activeTab={activeTab} hiddenOnMobile={activeTab === 'chat'} />
          
          {showMenu && <Sidebar isOpen={showMenu} onClose={() => setShowMenu(false)} user={currentUser} onLogout={handleLogout} onThemeToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')} onSavedClick={() => { setActiveTab('saved'); setShowMenu(false); }} currentTheme={theme} />}
          {showCreateModal && <CreatePostModal onClose={() => setShowCreateModal(false)} onPost={async (img, cap) => { await supabase.from('posts').insert({ user_id: currentUser.id, image_url: img, caption: cap }); fetchPosts(); setActiveTab('home'); }} />}
          {showCreateStoryModal && <CreateStoryModal onClose={() => setShowCreateStoryModal(false)} onPost={handlePostStory} />}
          {showEditProfileModal && currentUser && <EditProfileModal user={currentUser} onClose={() => setShowEditProfileModal(false)} onUpdate={async (d) => { await supabase.from('profiles').update({ full_name: d.fullName, bio: d.bio, avatar_url: d.avatar, cover_photo_url: d.coverPhoto }).eq('id', currentUser.id); fetchProfile(currentUser.id); }} />}
          {activeStory && <StoryViewer story={activeStory} onClose={() => setActiveStory(null)} />}
          {selectedPostDetail && <PostDetailModal post={selectedPostDetail} currentUser={currentUser} onClose={() => setSelectedPostDetail(null)} onLike={handleLike} onSave={() => {}} onOpenComments={setViewingCommentsPost} />}
          {viewingCommentsPost && <CommentPage post={viewingCommentsPost} currentUser={currentUser} onClose={() => setViewingCommentsPost(null)} onAddComment={async (pid, txt) => { await supabase.from('comments').insert({ post_id: pid, user_id: currentUser.id, text: txt }); }} />}
        </div>
      </div>
    </Router>
  );
};

export default App;
