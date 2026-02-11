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

interface Alert {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message';
  user: { id: string; username: string; avatar: string };
  content?: string;
  postId?: string;
  timestamp: string;
  read: boolean;
}

const FollowListModal: React.FC<{ 
  title: string; 
  users: User[]; 
  onClose: () => void; 
  onUserClick: (user: User) => void;
}> = ({ title, users, onClose, onUserClick }) => (
  <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[70vh]">
      <div className="p-6 border-b dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-xl font-black">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
        {users.length > 0 ? users.map(u => (
          <div key={u.id} onClick={() => { onUserClick(u); onClose(); }} className="flex items-center space-x-4 p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl cursor-pointer transition-colors group">
            <img src={u.avatar} className="w-12 h-12 rounded-full object-cover border border-gray-100 dark:border-slate-700" alt="" />
            <div className="flex-1">
              <p className="font-bold text-sm group-hover:text-brand-primary transition-colors">{u.fullName}</p>
              <p className="text-xs text-gray-400">@{u.username}</p>
            </div>
          </div>
        )) : (
          <div className="py-12 text-center opacity-40">
            <ICONS.Friends className="w-12 h-12 mx-auto mb-2" />
            <p className="font-bold text-sm">No users found</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
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
  
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showFollowList, setShowFollowList] = useState<{ title: string; type: 'following' | 'followers' } | null>(null);
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  const [selectedChatUser, setSelectedChatUser] = useState<User | null>(null);
  const [chatMessages, setChatMessages] = useState<{id: string, sender_id: string, text: string, created_at: string}[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatSearchResults, setChatSearchResults] = useState<User[]>([]);
  const [isSearchingChat, setIsSearchingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = useState<User[]>([]);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [isCommunityLoading, setIsCommunityLoading] = useState(false);

  const [stories, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);

  const STORY_TTL = 24 * 60 * 60 * 1000;

  useEffect(() => {
    if (currentUser && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [currentUser]);

  const addLocalAlert = (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => {
    const newAlert: Alert = {
      ...alert,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: 'Just now',
      read: false
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel('global_realtime')
      .on('postgres_changes', { event: '*', table: 'posts' }, () => fetchPosts())
      .on('postgres_changes', { event: 'INSERT', table: 'stories' }, () => fetchStories())
      .on('postgres_changes', { event: 'INSERT', table: 'messages', filter: `receiver_id=eq.${currentUser.id}` }, async (payload) => {
          if (selectedChatUser && payload.new.sender_id === selectedChatUser.id) {
              setChatMessages(prev => [...prev, payload.new as any]);
          }
          fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, selectedChatUser]);

  useEffect(() => {
    localStorage.setItem('lumina_theme', theme);
    const html = document.documentElement;
    theme === 'dark' ? html.classList.add('dark') : html.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetchProfile(session.user.id);
        } else {
          setSessionLoading(false);
        }
      } catch (err) {
        console.error("Session check error:", err);
        setSessionLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await fetchProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setSessionLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      
      if (error || !data) {
        console.warn("Profile not found or error fetching profile.");
        setSessionLoading(false);
        return;
      }

      const user: User = {
        id: data.id, 
        username: data.username, 
        fullName: data.full_name,
        avatar: data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`,
        coverPhoto: data.cover_photo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
        bio: data.bio || "Sharing light on Lumina ✨",
        work: data.work, 
        location: data.location, 
        website: data.website
      };
      
      setCurrentUser(user);
      localStorage.setItem('lumina_user', JSON.stringify(user));
    } catch (err) {
      console.error("Error in fetchProfile:", err);
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchPosts();
      fetchStories();
      fetchCommunityUsers();
      fetchConversations();
    }
  }, [currentUser]);

  const fetchStories = async () => {
    const expiryTime = new Date(Date.now() - STORY_TTL).toISOString();
    const { data, error } = await supabase.from('stories').select('*, profiles(*)').gt('created_at', expiryTime).order('created_at', { ascending: false });
    if (!error && data) {
      setStories(data.map(s => ({
        id: s.id, imageUrl: s.image_url, viewed: false, createdAt: new Date(s.created_at).getTime(),
        user: { id: s.profiles.id, username: s.profiles.username, avatar: s.profiles.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.profiles.username}`, fullName: s.profiles.full_name }
      })));
    }
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase.from('posts').select('*, profiles(*)').order('created_at', { ascending: false });
    if (!error && data) {
      const savedIds = JSON.parse(localStorage.getItem(`lumina_saved_${currentUser?.id}`) || '[]');
      const { data: userLikes } = await supabase.from('post_likes').select('post_id').eq('user_id', currentUser?.id);
      const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);
      const mappedPosts: Post[] = await Promise.all(data.map(async (p) => {
        const { data: commentsData } = await supabase.from('comments').select('*, profiles(username)').eq('post_id', p.id).order('created_at', { ascending: true });
        return {
          id: p.id, 
          user: { id: p.profiles.id, username: p.profiles.username, fullName: p.profiles.full_name, avatar: p.profiles.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.profiles.username}` },
          imageUrl: p.image_url, 
          caption: p.caption, 
          likes: p.likes_count || 0, 
          isLiked: likedPostIds.has(p.id), 
          isSaved: savedIds.includes(p.id), 
          timestamp: new Date(p.created_at).toLocaleDateString(),
          comments: commentsData ? commentsData.map(c => ({ id: c.id, username: c.profiles?.username || 'User', text: c.text, timestamp: new Date(c.created_at).toLocaleTimeString() })) : []
        };
      }));
      setPosts(mappedPosts);
    }
  };

  const handleSavePost = (postId: string) => {
    if (!currentUser) return;
    const storageKey = `lumina_saved_${currentUser.id}`;
    let savedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const isAlreadySaved = savedIds.includes(postId);
    if (isAlreadySaved) {
      savedIds = savedIds.filter((id: string) => id !== postId);
      setToast({ message: 'Removed from Saved', type: 'success' });
    } else {
      savedIds.push(postId);
      setToast({ message: 'Added to your circle!', type: 'success' });
    }
    localStorage.setItem(storageKey, JSON.stringify(savedIds));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, isSaved: !isAlreadySaved } : p));
  };

  const fetchCommunityUsers = async () => {
    if (!currentUser) return;
    setIsCommunityLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').neq('id', currentUser.id).limit(50);
    if (!error && data) {
      setAllUsers(data.map(u => ({ id: u.id, username: u.username, fullName: u.full_name, avatar: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`, bio: u.bio })));
    }
    const localFollowing = JSON.parse(localStorage.getItem(`lumina_following_${currentUser.id}`) || '[]');
    setFollowingIds(new Set(localFollowing));
    setIsCommunityLoading(false);
  };

  const toggleFollow = (userId: string) => {
    if (!currentUser) return;
    const newFollowing = new Set(followingIds);
    if (newFollowing.has(userId)) {
      newFollowing.delete(userId);
    } else {
      newFollowing.add(userId);
    }
    setFollowingIds(newFollowing);
    localStorage.setItem(`lumina_following_${currentUser.id}`, JSON.stringify(Array.from(newFollowing)));
  };

  const fetchConversations = async () => {
    if (!currentUser) return;
    const { data } = await supabase.from('messages').select('sender_id, receiver_id').or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`).order('created_at', { ascending: false });
    if (data) {
      const ids = Array.from(new Set(data.flatMap(m => [m.sender_id, m.receiver_id]).filter(id => id !== currentUser.id)));
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids);
        if (profiles) setConversations(profiles.map(p => ({ id: p.id, username: p.username, fullName: p.full_name, avatar: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}` })));
      }
    }
  };

  const fetchChatMessages = async (userId: string) => {
    const { data } = await supabase.from('messages').select('*').or(`and(sender_id.eq.${currentUser?.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUser?.id})`).order('created_at', { ascending: true });
    if (data) setChatMessages(data);
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedChatUser || !currentUser) return;
    const text = messageInput;
    setMessageInput('');
    const { data, error } = await supabase.from('messages').insert({ sender_id: currentUser.id, receiver_id: selectedChatUser.id, text }).select().single();
    if (!error && data) setChatMessages(prev => [...prev, data]);
  };

  const handleUpdateProfile = async (updatedData: Partial<User>) => {
    if (!currentUser) return;
    const { error } = await supabase.from('profiles').update({
      full_name: updatedData.fullName, bio: updatedData.bio, work: updatedData.work, location: updatedData.location,
      website: updatedData.website, avatar_url: updatedData.avatar, cover_photo_url: updatedData.coverPhoto
    }).eq('id', currentUser.id);
    if (!error) { 
      await fetchProfile(currentUser.id); 
      setToast({ message: 'Identity Refreshed!', type: 'success' }); 
    }
    else setToast({ message: 'Failed to update identity.', type: 'error' });
  };

  const handlePostStory = async (imageUrl: string) => {
    if (!currentUser) return;
    const { error } = await supabase.from('stories').insert({
      user_id: currentUser.id,
      image_url: imageUrl,
    });
    if (!error) {
      await fetchStories();
      setToast({ message: 'Story posted!', type: 'success' });
    } else {
      setToast({ message: 'Failed to post story.', type: 'error' });
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmittingAuth(true);
    const proxyEmail = `${authFormData.mobile}@lumina.app`;
    
    try {
      if (isRegistering) {
        if (authFormData.password !== authFormData.confirmPassword) { 
          setAuthError('Passwords do not match'); 
          setIsSubmittingAuth(false); 
          return; 
        }
        const { data, error } = await supabase.auth.signUp({ email: proxyEmail, password: authFormData.password });
        if (error) setAuthError(error.message);
        else if (data.user) {
          const username = authFormData.fullName.toLowerCase().replace(/\s+/g, '_') + Math.floor(Math.random() * 100);
          await supabase.from('profiles').insert({ 
            id: data.user.id, 
            username, 
            full_name: authFormData.fullName, 
            mobile: authFormData.mobile, 
            dob: authFormData.dob, 
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` 
          });
          setToast({ message: 'Registration successful!', type: 'success' });
          await fetchProfile(data.user.id);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: proxyEmail, password: authFormData.password });
        if (error) setAuthError('Invalid credentials');
        else if (data.user) {
          await fetchProfile(data.user.id);
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      setAuthError("An unexpected error occurred.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const isCurrentlyLiked = post.isLiked;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked: !isCurrentlyLiked, likes: isCurrentlyLiked ? p.likes - 1 : p.likes + 1 } : p));
    if (!isCurrentlyLiked) {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUser.id });
    } else {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
    }
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'create') setShowCreateModal(true);
    else { 
      setActiveTab(tab); 
      if (tab !== 'chat') setSelectedChatUser(null); 
    }
  };

  const handleStartChat = (user: User) => {
    setSelectedChatUser(user);
    setActiveTab('chat');
    fetchChatMessages(user.id);
  };

  if (sessionLoading) return (
    <div className="fixed inset-0 bg-white dark:bg-slate-950 flex flex-col items-center justify-center z-[200]">
      <h1 className="brand-font text-7xl font-bold brand-text-gradient animate-pulse-soft">Lumina</h1>
      <div className="mt-8 flex space-x-2">
        <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  );

  if (!currentUser) return (
    <div className="h-full flex flex-col md:flex-row bg-white dark:bg-slate-950 overflow-hidden">
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white dark:bg-slate-950 z-10">
        <div className="w-full max-w-md space-y-10 animate-in slide-in-from-left duration-700">
          <div className="text-center md:text-left">
            <h1 className="brand-font text-6xl md:text-7xl font-bold brand-text-gradient mb-2">Lumina</h1>
            <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px] ml-1">The Studio for Visual Light</p>
          </div>
          {authError && <div className="bg-red-50 text-red-600 p-5 rounded-[1.5rem] text-sm font-bold border border-red-100 flex items-center space-x-3">
            <span className="w-2 h-2 bg-red-600 rounded-full"></span>
            <span>{authError}</span>
          </div>}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isRegistering && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <input type="text" placeholder="Full Name" required className="w-full px-6 py-5 bg-gray-50 dark:bg-slate-900 border dark:border-slate-800 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-brand-primary transition-all font-medium" value={authFormData.fullName} onChange={(e) => setAuthFormData({...authFormData, fullName: e.target.value})} />
                <input type="date" placeholder="Birthday" required className="w-full px-6 py-5 bg-gray-50 dark:bg-slate-900 border dark:border-slate-800 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-brand-primary transition-all font-medium text-gray-400" value={authFormData.dob} onChange={(e) => setAuthFormData({...authFormData, dob: e.target.value})} />
              </div>
            )}
            <input type="tel" placeholder="Mobile Number" required className="w-full px-6 py-5 bg-gray-50 dark:bg-slate-900 border dark:border-slate-800 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-brand-primary transition-all font-medium" value={authFormData.mobile} onChange={(e) => setAuthFormData({...authFormData, mobile: e.target.value})} />
            <input type="password" placeholder="Password" required className="w-full px-6 py-5 bg-gray-50 dark:bg-slate-900 border dark:border-slate-800 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-brand-primary transition-all font-medium" value={authFormData.password} onChange={(e) => setAuthFormData({...authFormData, password: e.target.value})} />
            {isRegistering && (
              <input type="password" placeholder="Confirm Password" required className="w-full px-6 py-5 bg-gray-50 dark:bg-slate-900 border dark:border-slate-800 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-brand-primary transition-all font-medium" value={authFormData.confirmPassword} onChange={(e) => setAuthFormData({...authFormData, confirmPassword: e.target.value})} />
            )}
            <button type="submit" disabled={isSubmittingAuth} className="w-full bg-brand-gradient text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-brand-primary/20 transition-all active:scale-[0.98] hover:brightness-110 flex items-center justify-center">
              {isSubmittingAuth ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (isRegistering ? 'Create Account' : 'Sign In')}
            </button>
          </form>
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100 dark:border-slate-900"></div></div>
            <div className="relative flex justify-center"><span className="bg-white dark:bg-slate-950 px-4 text-[10px] font-black uppercase text-gray-300 tracking-widest">or Join our circle</span></div>
          </div>
          <button onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }} className="w-full text-center text-sm font-black text-brand-primary dark:text-brand-secondary hover:underline transition-all">
            {isRegistering ? 'Already a member? Login' : "New to Lumina? Join the glow"}
          </button>
        </div>
      </div>
      <div className="hidden md:flex w-1/2 bg-[#001a12] relative overflow-hidden flex-col items-center justify-center p-12 text-center select-none">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
           <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-primary rounded-full blur-[100px] animate-pulse"></div>
           <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-secondary rounded-full blur-[100px] animate-pulse-slow"></div>
        </div>
        <div className="relative z-10 max-w-lg animate-in zoom-in duration-1000">
          <div className="mb-12 relative inline-block">
            <div className="w-32 h-32 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 flex items-center justify-center mx-auto shadow-2xl relative z-20">
               <ICONS.Magic className="w-16 h-16 text-white animate-bounce-slow" />
            </div>
          </div>
          <h2 className="text-5xl font-black text-white tracking-tighter mb-6 leading-tight">Global Connectivity <br/> Starts Here</h2>
          <p className="text-white/60 text-lg font-medium leading-relaxed mb-10">Welcome to the future of visual social circles. Lumina connects creative minds from every corner of the world.</p>
        </div>
      </div>
    </div>
  );

  return (
    <Router>
      <div className="h-full flex flex-col md:flex-row bg-white dark:bg-slate-950 overflow-hidden text-gray-900 dark:text-gray-100">
        <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 p-6 z-[60] h-screen sticky top-0">
          <h1 className="brand-font text-4xl font-bold brand-text-gradient mb-12 cursor-pointer" onClick={() => handleTabChange('home')}>Lumina</h1>
          <nav className="flex-1 space-y-2">
             <button onClick={() => handleTabChange('home')} className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all ${activeTab === 'home' ? 'bg-brand-primary/10 text-brand-primary' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}><ICONS.Home className="w-6 h-6" /><span>Home</span></button>
             <button onClick={() => handleTabChange('chat')} className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all ${activeTab === 'chat' ? 'bg-brand-primary/10 text-brand-primary' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}><ICONS.Chat className="w-6 h-6" /><span>Messages</span></button>
             <button onClick={() => handleTabChange('friends')} className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all ${activeTab === 'friends' ? 'bg-brand-primary/10 text-brand-primary' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}><ICONS.Friends className="w-6 h-6" /><span>Community</span></button>
             <button onClick={() => handleTabChange('profile')} className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all ${activeTab === 'profile' ? 'bg-brand-primary/10 text-brand-primary' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}><img src={currentUser.avatar} className="w-6 h-6 rounded-full" alt="" /><span>Profile</span></button>
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          {toast && <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[700] px-6 py-3 rounded-2xl shadow-2xl font-bold animate-in fade-in slide-in-from-top ${toast.type === 'success' ? 'bg-brand-primary text-white' : 'bg-brand-secondary text-white'}`}>{toast.message}</div>}

          <header className={`${(selectedChatUser && activeTab === 'chat') ? 'hidden md:flex' : 'flex'} flex-none bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-4 pt-4 pb-3 items-center justify-between sticky top-0 z-50 md:hidden`}>
            <button onClick={() => setShowMenu(true)} className="p-2"><ICONS.Menu className="w-6 h-6" /></button>
            <h1 className="brand-font text-3xl font-bold brand-text-gradient" onClick={() => handleTabChange('home')}>Lumina</h1>
            <div className="flex items-center space-x-1">
              <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 text-brand-primary"><ICONS.Magic className="w-6 h-6" /></button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
            <div className={`w-full mx-auto p-0 ${activeTab === 'chat' ? 'h-full' : 'max-w-[1200px] md:p-8'}`}>
              {activeTab === 'home' && (
                <div className="space-y-8">
                  <div className="flex space-x-4 overflow-x-auto no-scrollbar py-6 px-4 md:px-0">
                    <div onClick={() => setShowCreateStoryModal(true)} className="flex flex-col items-center space-y-2 cursor-pointer min-w-[85px]">
                      <div className="relative w-[75px] h-[75px]">
                        <img src={currentUser.avatar} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-900 shadow-md" alt="" />
                        <div className="absolute bottom-0 right-0 bg-brand-secondary text-white rounded-full p-1 border-2 border-white dark:border-slate-900 shadow-sm"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4v16m8-8H4"></path></svg></div>
                      </div>
                      <span className="text-[10px] font-black uppercase text-gray-400">Your Story</span>
                    </div>
                    {stories.map(s => (
                      <div key={s.id} onClick={() => setActiveStory(s)} className="flex flex-col items-center space-y-2 cursor-pointer min-w-[85px]">
                        <div className="w-[75px] h-[75px] rounded-full story-ring shadow-lg">
                          <img src={s.user.avatar} className="w-full h-full rounded-full border-2 border-white dark:border-slate-900 object-cover bg-white" alt="" />
                        </div>
                        <span className="text-[10px] font-black truncate w-full text-center uppercase text-gray-600 dark:text-gray-300">{s.user.username}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-6 flex flex-col items-center pb-24 md:pb-8">
                    {posts.length > 0 ? posts.map(post => (
                      <PostCard key={post.id} post={post} currentUser={currentUser} onLike={handleLike} onSave={handleSavePost} onComment={() => setViewingCommentsPost(post)} onUserClick={(u) => { setViewingUser(u); setActiveTab('profile'); }} onDelete={async () => fetchPosts()} onEdit={() => {}} onOpenComments={setViewingCommentsPost} onPhotoClick={setSelectedPostDetail} />
                    )) : (
                      <div className="py-20 text-center opacity-40">
                         <ICONS.Magic className="w-20 h-20 mx-auto mb-4" />
                         <p className="font-bold">No moments shared yet. Be the first to glow!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="h-full flex flex-col md:flex-row bg-white dark:bg-slate-950 md:rounded-3xl overflow-hidden md:border dark:border-slate-800 md:m-4 lg:m-8 shadow-2xl">
                  <div className={`w-full md:w-96 border-r dark:border-slate-800 flex flex-col ${selectedChatUser ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-6 border-b dark:border-slate-800 flex flex-col space-y-4">
                      <h2 className="font-black text-3xl tracking-tight">Messages</h2>
                      <div className="relative">
                        <ICONS.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Quick search..." className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-primary transition-all shadow-inner" value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
                      {conversations.map(u => (
                        <div key={u.id} onClick={() => handleStartChat(u)} className={`flex items-center space-x-4 p-4 rounded-[1.5rem] cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900 transition-all ${selectedChatUser?.id === u.id ? 'bg-brand-primary/10 border-l-4 border-brand-primary shadow-sm' : ''}`}>
                          <img src={u.avatar} className="w-14 h-14 rounded-full object-cover shadow-sm" alt="" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{u.username}</p>
                            <p className="text-xs text-gray-500 truncate font-medium">Click to message...</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={`flex-1 flex flex-col h-full bg-white dark:bg-slate-950 ${selectedChatUser ? 'fixed inset-0 z-[100] md:relative md:z-auto' : 'hidden md:flex'}`}>
                    {selectedChatUser ? (
                      <>
                        <div className="p-4 md:p-5 border-b dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950/90 backdrop-blur-xl z-20">
                          <div className="flex items-center space-x-4">
                            <button onClick={() => setSelectedChatUser(null)} className="md:hidden p-2.5 bg-gray-100 dark:bg-slate-800 rounded-2xl"><ICONS.ChevronLeft className="w-6 h-6" /></button>
                            <img src={selectedChatUser.avatar} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover" alt="" />
                            <p className="font-black text-sm md:text-base">{selectedChatUser.username}</p>
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-gray-50/30 dark:bg-slate-900/10">
                          {chatMessages.map((m, idx) => (
                            <div key={m.id || idx} className={`flex flex-col ${m.sender_id === currentUser.id ? 'items-end' : 'items-start'}`}>
                              <div className={`max-w-[85%] md:max-w-[70%] px-5 py-3.5 rounded-[1.5rem] text-sm md:text-[15px] font-medium shadow-sm ${m.sender_id === currentUser.id ? 'bg-brand-gradient text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-bl-none border dark:border-slate-700'}`}>
                                {m.text}
                              </div>
                            </div>
                          ))}
                          <div ref={chatEndRef} />
                        </div>
                        <div className="p-4 md:p-6 border-t dark:border-slate-800 bg-white dark:bg-slate-950">
                          <div className="flex items-end space-x-3 max-w-4xl mx-auto">
                            <textarea rows={1} placeholder="Type a message..." className="flex-1 bg-gray-50 dark:bg-slate-900 px-6 py-4 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-brand-primary transition-all border-none dark:text-white shadow-inner resize-none max-h-32 font-medium" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                            <button onClick={sendMessage} disabled={!messageInput.trim()} className="w-14 h-14 bg-brand-gradient text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20"><ICONS.Share className="w-6 h-6" /></button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                        <ICONS.Chat className="w-20 h-20 mb-4" />
                        <p className="font-black">Select a chat to start</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'friends' && (
                <div className="p-4 md:p-0 space-y-8 animate-in fade-in duration-500">
                  <h2 className="text-4xl font-black tracking-tighter">Community</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24 md:pb-8">
                    {allUsers.map(user => (
                      <div key={user.id} className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[2.5rem] p-6 shadow-sm flex flex-col items-center text-center">
                        <img src={user.avatar} className="w-20 h-20 rounded-full mb-4 object-cover border-4 border-gray-50" alt="" />
                        <h3 className="font-black text-lg">{user.fullName}</h3>
                        <p className="text-brand-primary font-bold text-xs mb-4">@{user.username}</p>
                        <button onClick={() => toggleFollow(user.id)} className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${followingIds.has(user.id) ? 'bg-gray-100 text-gray-500' : 'bg-brand-primary text-white shadow-lg'}`}>{followingIds.has(user.id) ? 'Unfollow' : 'Follow'}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'profile' && currentUser && (
                <div className="bg-white dark:bg-slate-900 md:rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in duration-500">
                  <div className="h-48 md:h-64 relative">
                    <img src={currentUser.coverPhoto} className="w-full h-full object-cover" alt="Cover" />
                    <div className="absolute inset-0 bg-black/20"></div>
                  </div>
                  <div className="px-6 md:px-12 pb-24 md:pb-12 -mt-16 relative z-10">
                    <img src={currentUser.avatar} className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-8 border-white dark:border-slate-900 shadow-2xl object-cover bg-white mb-6" alt="" />
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
                       <div>
                          <h2 className="text-4xl font-black tracking-tighter mb-1">{currentUser.fullName}</h2>
                          <p className="text-brand-primary font-black uppercase tracking-widest text-sm">@{currentUser.username}</p>
                       </div>
                       <button onClick={() => setShowEditProfileModal(true)} className="mt-6 md:mt-0 px-8 py-3.5 bg-brand-gradient text-white rounded-2xl font-black text-sm shadow-xl">Edit Identity</button>
                    </div>
                    <p className="max-w-2xl text-gray-600 dark:text-gray-400 font-medium leading-relaxed mb-12">{currentUser.bio}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {posts.filter(p => p.user.id === currentUser.id).map(p => (
                        <div key={p.id} onClick={() => setSelectedPostDetail(p)} className="aspect-square rounded-2xl overflow-hidden cursor-pointer group relative">
                          <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
          <Navbar onTabChange={handleTabChange} activeTab={activeTab} />
          {showMenu && <Sidebar isOpen={showMenu} onClose={() => setShowMenu(false)} user={currentUser} onLogout={() => supabase.auth.signOut()} onThemeToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')} onSavedClick={() => { setActiveTab('saved'); setShowMenu(false); }} currentTheme={theme} />}
          {showCreateModal && <CreatePostModal onClose={() => setShowCreateModal(false)} onPost={async (img, cap) => { await supabase.from('posts').insert({ user_id: currentUser.id, image_url: img, caption: cap }); fetchPosts(); setActiveTab('home'); }} />}
          {showCreateStoryModal && <CreateStoryModal onClose={() => setShowCreateStoryModal(false)} onPost={handlePostStory} />}
          {showEditProfileModal && currentUser && <EditProfileModal user={currentUser} onClose={() => setShowEditProfileModal(false)} onUpdate={handleUpdateProfile} />}
          {activeStory && <StoryViewer story={activeStory} onClose={() => setActiveStory(null)} />}
          {selectedPostDetail && <PostDetailModal post={selectedPostDetail} currentUser={currentUser} onClose={() => setSelectedPostDetail(null)} onLike={handleLike} onSave={handleSavePost} onOpenComments={setViewingCommentsPost} />}
          {viewingCommentsPost && <CommentPage post={viewingCommentsPost} currentUser={currentUser} onClose={() => setViewingCommentsPost(null)} onAddComment={async (pid, txt) => { await supabase.from('comments').insert({ post_id: pid, user_id: currentUser.id, text: txt }); fetchPosts(); }} />}
        </div>
      </div>
    </Router>
  );
};

export default App;