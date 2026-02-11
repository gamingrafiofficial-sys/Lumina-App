
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

// Local Component for Follower/Following List
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
  
  // Alerts state
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  // Chat States
  const [selectedChatUser, setSelectedChatUser] = useState<User | null>(null);
  const [chatMessages, setChatMessages] = useState<{id: string, sender_id: string, text: string, created_at: string}[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatSearchResults, setChatSearchResults] = useState<User[]>([]);
  const [isSearchingChat, setIsSearchingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = useState<User[]>([]);

  // Community States
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [isCommunityLoading, setIsCommunityLoading] = useState(false);

  const [stories, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);

  const STORY_TTL = 24 * 60 * 60 * 1000;

  // Notification Permission Request
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

  const showSystemNotification = (title: string, body: string, senderId: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico',
      });

      notification.onclick = () => {
        window.focus();
        const sender = allUsers.find(u => u.id === senderId);
        if (sender) handleStartChat(sender);
        else setActiveTab('chat');
        notification.close();
      };
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
          } else {
              const { data: senderData } = await supabase.from('profiles').select('username, avatar_url').eq('id', payload.new.sender_id).single();
              const senderName = senderData?.username || 'Someone';
              
              // Add to local alerts
              addLocalAlert({
                type: 'message',
                user: { id: payload.new.sender_id, username: senderName, avatar: senderData?.avatar_url || '' },
                content: payload.new.text
              });
              
              showSystemNotification(`Message from ${senderName}`, payload.new.text, payload.new.sender_id);
          }
          fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, selectedChatUser, allUsers]);

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchProfile(session.user.id);
      else setSessionLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchProfile(session.user.id);
      else { setCurrentUser(null); setSessionLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!error && data) {
      const user: User = {
        id: data.id, username: data.username, fullName: data.full_name,
        avatar: data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`,
        coverPhoto: data.cover_photo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
        bio: data.bio || "Sharing light on Lumina ✨",
        work: data.work, location: data.location, website: data.website
      };
      setCurrentUser(user);
      localStorage.setItem('lumina_user', JSON.stringify(user));
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

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (chatSearchQuery.trim()) performChatSearch();
      else setChatSearchResults([]);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [chatSearchQuery]);

  const performChatSearch = async () => {
    if (!chatSearchQuery.trim()) return;
    setIsSearchingChat(true);
    const query = chatSearchQuery.trim();
    const { data, error } = await supabase.from('profiles').select('*').neq('id', currentUser?.id).or(`username.ilike.%${query}%,full_name.ilike.%${query}%,mobile.ilike.%${query}%`).limit(10);
    if (!error && data) {
      setChatSearchResults(data.map(u => ({
        id: u.id, username: u.username, fullName: u.full_name, avatar: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`
      })));
    }
    setIsSearchingChat(false);
  };

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
          id: p.id, user: { id: p.profiles.id, username: p.profiles.username, fullName: p.profiles.full_name, avatar: p.profiles.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.profiles.username}` },
          imageUrl: p.image_url, caption: p.caption, likes: p.likes_count || 0, isLiked: likedPostIds.has(p.id), isSaved: savedIds.includes(p.id), timestamp: new Date(p.created_at).toLocaleDateString(),
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
    const { data, error } = await supabase.from('profiles').select('*').neq('id', currentUser.id);
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
    const userToFollow = allUsers.find(u => u.id === userId);
    
    if (newFollowing.has(userId)) {
      newFollowing.delete(userId);
    } else {
      newFollowing.add(userId);
      if (userToFollow) {
        addLocalAlert({
          type: 'follow',
          user: { id: userToFollow.id, username: userToFollow.username, avatar: userToFollow.avatar }
        });
      }
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
    if (!error) { fetchProfile(currentUser.id); setToast({ message: 'Identity Refreshed!', type: 'success' }); }
    else setToast({ message: 'Failed to update identity.', type: 'error' });
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmittingAuth(true);
    const proxyEmail = `${authFormData.mobile}@lumina.app`;
    if (isRegistering) {
      if (authFormData.password !== authFormData.confirmPassword) { setAuthError('Passwords do not match'); setIsSubmittingAuth(false); return; }
      const { data, error } = await supabase.auth.signUp({ email: proxyEmail, password: authFormData.password });
      if (error) setAuthError(error.message);
      else if (data.user) {
        const username = authFormData.fullName.toLowerCase().replace(/\s+/g, '_') + Math.floor(Math.random() * 100);
        await supabase.from('profiles').insert({ id: data.user.id, username, full_name: authFormData.fullName, mobile: authFormData.mobile, dob: authFormData.dob, avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` });
        setToast({ message: 'Registration successful!', type: 'success' });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: proxyEmail, password: authFormData.password });
      if (error) setAuthError('Invalid credentials');
    }
    setIsSubmittingAuth(false);
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const isCurrentlyLiked = post.isLiked;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked: !isCurrentlyLiked, likes: isCurrentlyLiked ? p.likes - 1 : p.likes + 1 } : p));
    
    if (!isCurrentlyLiked) {
      // Add local alert for like
      addLocalAlert({
        type: 'like',
        user: { id: currentUser.id, username: 'Someone', avatar: currentUser.avatar },
        postId: postId
      });
      await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUser.id });
    } else {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
    }
  };

  const handlePostStory = async (imageUrl: string) => {
    if (!currentUser) return;
    const { error } = await supabase.from('stories').insert({ user_id: currentUser.id, image_url: imageUrl });
    if (!error) { fetchStories(); setToast({ message: 'Story shared!', type: 'success' }); }
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'create') setShowCreateModal(true);
    else { 
      setActiveTab(tab); 
      if (tab !== 'chat') setSelectedChatUser(null); 
      if (tab === 'friends') fetchCommunityUsers();
      if (tab === 'alerts') setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    }
  };

  const handleStartChat = (user: User) => {
    setSelectedChatUser(user);
    setChatSearchQuery('');
    setChatSearchResults([]);
    setActiveTab('chat');
    fetchChatMessages(user.id);
  };

  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  if (sessionLoading) return (
    <div className="fixed inset-0 bg-white dark:bg-slate-950 flex flex-col items-center justify-center z-[200]">
      <h1 className="brand-font text-7xl font-bold brand-text-gradient animate-pulse-soft">Lumina</h1>
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
            <div className="absolute -top-8 -left-8 w-16 h-16 bg-brand-primary rounded-full border-4 border-[#001a12] shadow-xl animate-float-slow overflow-hidden">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="w-full h-full" alt="" />
            </div>
            <div className="absolute -bottom-6 -right-10 w-20 h-20 bg-brand-secondary rounded-full border-4 border-[#001a12] shadow-xl animate-float overflow-hidden">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" className="w-full h-full" alt="" />
            </div>
            <div className="absolute top-1/2 -right-16 w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center shadow-lg animate-float-slow">
               <ICONS.Heart className="w-6 h-6 text-brand-secondary fill-current" />
            </div>
          </div>
          <h2 className="text-5xl font-black text-white tracking-tighter mb-6 leading-tight">Global Connectivity <br/> Starts Here</h2>
          <p className="text-white/60 text-lg font-medium leading-relaxed mb-10">Welcome to the future of visual social circles. Lumina connects creative minds from every corner of the world, transforming daily moments into shared global art.</p>
          <div className="flex flex-col items-center space-y-4">
             <div className="flex -space-x-4">
               {[1,2,3,4,5].map(i => (
                 <img key={i} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`} className="w-12 h-12 rounded-full border-4 border-[#001a12] bg-white/10 backdrop-blur-sm" alt="" />
               ))}
               <div className="w-12 h-12 rounded-full border-4 border-[#001a12] bg-brand-gradient flex items-center justify-center text-white text-[10px] font-black">+10k</div>
             </div>
             <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40">Trusted by the global creative circle</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Router>
      <div className="h-full flex flex-col md:flex-row bg-white dark:bg-slate-950 overflow-hidden text-gray-900 dark:text-gray-100">
        <aside className={`${selectedChatUser ? 'hidden md:flex' : 'hidden md:flex'} md:flex-col w-72 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 p-6 z-[60] h-screen sticky top-0`}>
          <h1 className="brand-font text-4xl font-bold brand-text-gradient mb-12 cursor-pointer" onClick={() => handleTabChange('home')}>Lumina</h1>
          <nav className="flex-1 space-y-2">
             <button onClick={() => handleTabChange('home')} className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all ${activeTab === 'home' ? 'bg-brand-primary/10 text-brand-primary' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}><ICONS.Home className="w-6 h-6" /><span>Home</span></button>
             <button onClick={() => handleTabChange('alerts')} className={`w-full flex items-center justify-between space-x-4 p-4 rounded-2xl transition-all ${activeTab === 'alerts' ? 'bg-brand-primary/10 text-brand-primary' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                <div className="flex items-center space-x-4">
                  <ICONS.Alert className="w-6 h-6" />
                  <span>Alerts</span>
                </div>
                {unreadAlertsCount > 0 && <span className="bg-brand-secondary text-white text-[10px] font-black px-2 py-1 rounded-full">{unreadAlertsCount}</span>}
             </button>
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
              <button onClick={() => handleTabChange('alerts')} className="p-2 relative">
                <ICONS.Alert className="w-6 h-6 text-brand-primary" />
                {unreadAlertsCount > 0 && <div className="absolute top-2 right-2 w-2 h-2 bg-brand-secondary rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></div>}
              </button>
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

              {activeTab === 'alerts' && (
                <div className="p-4 md:p-0 space-y-8 animate-in fade-in duration-500 max-w-2xl mx-auto">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b dark:border-slate-800 pb-6">
                     <div>
                       <h2 className="text-4xl font-black tracking-tighter">Alert Center</h2>
                       <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-1">Updates from your circle</p>
                     </div>
                     <button 
                       onClick={() => setAlerts([])} 
                       className="mt-4 md:mt-0 text-[10px] font-black uppercase text-gray-400 hover:text-brand-secondary transition-colors"
                     >
                       Clear All
                     </button>
                  </div>
                  
                  <div className="space-y-2 pb-24 md:pb-8">
                    {alerts.length > 0 ? alerts.map(alert => (
                      <div 
                        key={alert.id} 
                        onClick={() => {
                          if (alert.type === 'message') {
                            const user = allUsers.find(u => u.id === alert.user.id);
                            if (user) handleStartChat(user);
                          } else if (alert.postId) {
                            const post = posts.find(p => p.id === alert.postId);
                            if (post) setSelectedPostDetail(post);
                          }
                        }}
                        className={`flex items-start space-x-4 p-5 rounded-[2rem] transition-all cursor-pointer group ${!alert.read ? 'bg-brand-primary/5 dark:bg-brand-primary/10 border-l-4 border-brand-primary' : 'hover:bg-gray-50 dark:hover:bg-slate-900 border-l-4 border-transparent'}`}
                      >
                        <div className="relative flex-none">
                          <img src={alert.user.avatar} className="w-14 h-14 rounded-[1.5rem] object-cover shadow-sm" alt="" />
                          <div className={`absolute -bottom-1 -right-1 p-1.5 rounded-full border-2 border-white dark:border-slate-900 shadow-md ${
                            alert.type === 'like' ? 'bg-brand-secondary text-white' :
                            alert.type === 'comment' ? 'bg-brand-primary text-white' :
                            alert.type === 'follow' ? 'bg-blue-500 text-white' :
                            'bg-green-500 text-white'
                          }`}>
                            {alert.type === 'like' && <ICONS.Heart className="w-2.5 h-2.5 fill-current" />}
                            {alert.type === 'comment' && <ICONS.Comment className="w-2.5 h-2.5 fill-current" />}
                            {alert.type === 'follow' && <ICONS.Friends className="w-2.5 h-2.5 fill-current" />}
                            {alert.type === 'message' && <ICONS.Chat className="w-2.5 h-2.5 fill-current" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium dark:text-gray-200">
                            <span className="font-black text-gray-900 dark:text-white mr-1.5">{alert.user.username}</span>
                            {alert.type === 'like' && 'shone light on your moment.'}
                            {alert.type === 'comment' && `shared a thought: "${alert.content}"`}
                            {alert.type === 'follow' && 'started glowing with you.'}
                            {alert.type === 'message' && `sent you a private spark: "${alert.content}"`}
                          </p>
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1.5 flex items-center">
                            <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                            {alert.timestamp}
                          </p>
                        </div>
                      </div>
                    )) : (
                      <div className="py-20 text-center opacity-40">
                         <div className="w-20 h-20 bg-gray-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                           <ICONS.Alert className="w-10 h-10" />
                         </div>
                         <p className="font-black uppercase tracking-widest text-sm">Silence is Golden</p>
                         <p className="text-xs font-medium mt-2">No new alerts to show right now.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'saved' && (
                <div className="p-4 md:p-0 space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                     <div>
                       <h2 className="text-4xl font-black tracking-tighter">Your Circle</h2>
                       <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-1">Saved bookmarked moments</p>
                     </div>
                  </div>
                  <div className="space-y-6 flex flex-col items-center pb-24 md:pb-8">
                    {posts.filter(p => p.isSaved).length > 0 ? posts.filter(p => p.isSaved).map(post => (
                      <PostCard key={post.id} post={post} currentUser={currentUser} onLike={handleLike} onSave={handleSavePost} onComment={() => setViewingCommentsPost(post)} onUserClick={(u) => { setViewingUser(u); setActiveTab('profile'); }} onDelete={async () => fetchPosts()} onEdit={() => {}} onOpenComments={setViewingCommentsPost} onPhotoClick={setSelectedPostDetail} />
                    )) : (
                      <div className="py-20 text-center opacity-40">
                         <ICONS.Bookmark className="w-20 h-20 mx-auto mb-4" />
                         <p className="font-bold">You haven't added any moments to your circle yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'friends' && (
                <div className="p-4 md:p-0 space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                     <div>
                       <h2 className="text-4xl font-black tracking-tighter">Community</h2>
                       <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-1">Discover light bringers</p>
                     </div>
                  </div>
                  {isCommunityLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[1,2,3,4,5,6].map(i => ( <div key={i} className="bg-gray-50 dark:bg-slate-900 rounded-[2.5rem] p-6 h-48 animate-pulse"></div> ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24 md:pb-8">
                      {allUsers.map(user => (
                        <div key={user.id} className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[2.5rem] p-6 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700"></div>
                          <div className="flex items-start space-x-4 relative z-10">
                            <div className="relative">
                              <img src={user.avatar} className="w-16 h-16 rounded-[1.5rem] object-cover bg-gray-100 dark:bg-slate-800 shadow-lg" alt="" />
                              {followingIds.has(user.id) && (
                                <div className="absolute -top-2 -right-2 bg-brand-primary text-white p-1 rounded-full border-2 border-white dark:border-slate-900">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-black text-lg truncate tracking-tight">{user.fullName}</h3>
                              <p className="text-brand-primary font-bold text-xs">@{user.username}</p>
                              <p className="text-gray-400 text-xs mt-2 line-clamp-2 italic font-medium">"{user.bio || 'Spreading positive vibes and bright moments'}"</p>
                            </div>
                          </div>
                          <div className="mt-8 flex items-center space-x-3 relative z-10">
                            <button onClick={() => toggleFollow(user.id)} className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${followingIds.has(user.id) ? 'bg-gray-100 dark:bg-slate-800 text-gray-500' : 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95'}`}>{followingIds.has(user.id) ? 'Unfollow' : 'Follow'}</button>
                            <button onClick={() => handleStartChat(user)} className="w-12 h-12 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl flex items-center justify-center hover:bg-brand-primary/10 hover:text-brand-primary transition-all active:scale-95"><ICONS.Chat className="w-6 h-6" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="h-full flex flex-col md:flex-row bg-white dark:bg-slate-950 md:rounded-3xl overflow-hidden md:border dark:border-slate-800 md:m-4 lg:m-8 shadow-2xl">
                  <div className={`w-full md:w-96 border-r dark:border-slate-800 flex flex-col ${selectedChatUser ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-6 border-b dark:border-slate-800 flex flex-col space-y-4">
                      <div className="flex items-center justify-between">
                         <h2 className="font-black text-3xl tracking-tight">Messages</h2>
                         <button className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl" onClick={() => setActiveTab('friends')}><ICONS.Create className="w-5 h-5" /></button>
                      </div>
                      <div className="relative">
                        <ICONS.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Quick search..." className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-primary transition-all shadow-inner" value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
                      {isSearchingChat ? (
                        <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>
                      ) : chatSearchResults.length > 0 ? (
                        <>
                          <p className="px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Community Members</p>
                          {chatSearchResults.map(u => (
                            <div key={u.id} onClick={() => handleStartChat(u)} className="flex items-center space-x-4 p-4 rounded-[1.5rem] cursor-pointer hover:bg-brand-primary/5 transition-all group">
                              <div className="relative">
                                <img src={u.avatar} className="w-12 h-12 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform" alt="" />
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-brand-primary rounded-full border-2 border-white dark:border-slate-900"></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate">{u.fullName}</p>
                                <p className="text-xs text-gray-400 truncate">@{u.username}</p>
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <>
                          {conversations.length > 0 ? ( conversations.map(u => (
                            <div key={u.id} onClick={() => handleStartChat(u)} className={`flex items-center space-x-4 p-4 rounded-[1.5rem] cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900 transition-all ${selectedChatUser?.id === u.id ? 'bg-brand-primary/10 border-l-4 border-brand-primary shadow-sm' : ''}`}>
                              <div className="relative">
                                <img src={u.avatar} className="w-14 h-14 rounded-full object-cover shadow-sm" alt="" />
                                <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <p className="font-bold text-sm truncate">{u.username}</p>
                                  <span className="text-[10px] text-gray-400 font-bold">Just now</span>
                                </div>
                                <p className="text-xs text-gray-500 truncate font-medium">Click to continue conversation...</p>
                              </div>
                            </div>
                          )) ) : (
                            <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                              <div className="w-16 h-16 bg-gray-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4"><ICONS.Chat className="w-8 h-8 opacity-20" /></div>
                              <p className="text-sm font-bold">No conversations yet</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className={`flex-1 flex flex-col h-full bg-white dark:bg-slate-950 ${selectedChatUser ? 'fixed inset-0 z-[100] md:relative md:z-auto' : 'hidden md:flex'}`}>
                    {selectedChatUser ? (
                      <>
                        <div className="p-4 md:p-5 border-b dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl z-20">
                          <div className="flex items-center space-x-4">
                            <button onClick={() => setSelectedChatUser(null)} className="md:hidden p-2.5 bg-gray-100 dark:bg-slate-800 rounded-2xl transition-all active:scale-90"><ICONS.ChevronLeft className="w-6 h-6" /></button>
                            <div className="relative group cursor-pointer" onClick={() => { setViewingUser(selectedChatUser); setActiveTab('profile'); setSelectedChatUser(null); }}>
                              <img src={selectedChatUser.avatar} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-brand-primary/20 p-0.5" alt="" />
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-950"></div>
                            </div>
                            <div className="cursor-pointer" onClick={() => { setViewingUser(selectedChatUser); setActiveTab('profile'); setSelectedChatUser(null); }}>
                              <p className="font-black text-sm md:text-base leading-none mb-1.5">{selectedChatUser.username}</p>
                              <p className="text-[9px] text-green-500 font-black uppercase tracking-widest flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>Shining Now</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                             <button className="p-3 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/5 rounded-2xl transition-all"><ICONS.Magic className="w-5 h-5" /></button>
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 space-y-6 bg-gray-50/30 dark:bg-slate-900/10">
                          {chatMessages.length > 0 ? chatMessages.map((m, idx) => {
                            const isMe = m.sender_id === currentUser.id;
                            return (
                              <div key={m.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-3 duration-500`}>
                                <div className={`group relative max-w-[85%] md:max-w-[70%] px-5 py-3.5 rounded-[1.5rem] text-sm md:text-[15px] font-medium shadow-sm transition-all ${isMe ? 'bg-brand-gradient text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-bl-none border dark:border-slate-700'}`}>
                                  {m.text}
                                  <div className={`absolute bottom-[-18px] ${isMe ? 'right-1' : 'left-1'} text-[9px] font-black uppercase text-gray-400 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity`}>
                                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>
                            );
                          }) : ( <div className="h-full flex flex-col items-center justify-center opacity-40"> <div className="w-20 h-20 bg-brand-primary/5 rounded-full flex items-center justify-center mb-6"><ICONS.Magic className="w-10 h-10 text-brand-primary" /></div> <p className="font-black text-sm uppercase tracking-[0.3em]">No light shared yet</p> </div> )}
                          <div ref={chatEndRef} />
                        </div>
                        <div className="p-4 md:p-6 border-t dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl sticky bottom-0 z-20 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6">
                          <div className="flex items-end space-x-3 max-w-4xl mx-auto">
                            <button className="p-4 bg-gray-100 dark:bg-slate-800 text-gray-500 rounded-2xl hover:text-brand-primary transition-colors"><ICONS.Create className="w-6 h-6" /></button>
                            <div className="flex-1 relative">
                              <textarea rows={1} placeholder="Type a message..." className="w-full bg-gray-50 dark:bg-slate-900 px-6 py-4 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-brand-primary transition-all border-none dark:text-white shadow-inner resize-none max-h-32 font-medium" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                            </div>
                            <button onClick={sendMessage} disabled={!messageInput.trim()} className="w-14 h-14 bg-brand-gradient text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20 disabled:grayscale"><ICONS.Share className="w-6 h-6" /></button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-gray-700 space-y-8 animate-in fade-in zoom-in-95 duration-700">
                        <div className="relative"> <div className="w-40 h-40 bg-gray-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center border-2 border-dashed border-gray-100 dark:border-slate-800"><ICONS.Chat className="w-20 h-20 opacity-10" /></div> <div className="absolute -top-4 -right-4 w-12 h-12 bg-brand-gradient rounded-3xl flex items-center justify-center text-white shadow-xl animate-bounce-slow"><ICONS.Magic className="w-6 h-6" /></div> </div>
                        <div className="text-center px-8"> <p className="font-black text-2xl uppercase tracking-[0.2em] mb-3 text-gray-900 dark:text-gray-100">Private Space</p> <p className="text-sm font-bold opacity-60 max-w-xs mx-auto leading-relaxed">Choose a connection from the list or use the quick search.</p> </div>
                        <button onClick={() => setActiveTab('friends')} className="px-8 py-4 bg-brand-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-all">Explore Community</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="bg-white dark:bg-slate-900 md:rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in duration-500">
                  <div className="h-56 md:h-72 relative overflow-hidden">
                    <img src={currentUser.coverPhoto || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop'} className="w-full h-full object-cover" alt="Cover" />
                    <div className="absolute inset-0 bg-black/20"></div>
                  </div>
                  <div className="px-6 md:px-12 pb-24 md:pb-12 -mt-24 relative z-10">
                    <div className="relative inline-block mb-6"><img src={currentUser.avatar} className="w-36 h-36 md:w-44 md:h-44 rounded-[3rem] border-8 border-white dark:border-slate-900 shadow-2xl object-cover bg-white" alt="" /></div>
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
                       <div>
                          <h2 className="text-4xl font-black tracking-tighter mb-1">{currentUser.fullName}</h2>
                          <p className="text-brand-primary font-black uppercase tracking-widest text-sm">@{currentUser.username}</p>
                          <div className="flex flex-wrap gap-4 mt-4">
                            {currentUser.work && <div className="flex items-center text-xs font-bold text-gray-500"><ICONS.Briefcase className="w-4 h-4 mr-2" />{currentUser.work}</div>}
                            {currentUser.location && <div className="flex items-center text-xs font-bold text-gray-500"><ICONS.MapPin className="w-4 h-4 mr-2" />{currentUser.location}</div>}
                          </div>
                       </div>
                       <div className="flex space-x-3 mt-6 md:mt-0">
                          <button onClick={() => setShowEditProfileModal(true)} className="px-8 py-3.5 bg-brand-gradient text-white rounded-2xl font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all">Edit Identity</button>
                          <button onClick={() => handleStartChat(currentUser)} className="p-3.5 bg-gray-50 dark:bg-slate-800 rounded-2xl shadow-sm hover:bg-gray-100 transition-colors"><ICONS.Chat className="w-6 h-6" /></button>
                       </div>
                    </div>
                    <div className="grid grid-cols-3 gap-8 mb-10 py-6 border-y dark:border-slate-800">
                       <div className="text-center cursor-default">
                         <p className="text-2xl font-black tracking-tight">{posts.filter(p => p.user.id === currentUser.id).length}</p>
                         <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Moments</p>
                       </div>
                       <div className="text-center cursor-pointer active:scale-95 transition-transform" onClick={() => setShowFollowList({ title: 'Followers', type: 'followers' })}>
                         <p className="text-2xl font-black tracking-tight">0</p>
                         <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Followers</p>
                       </div>
                       <div className="text-center cursor-pointer active:scale-95 transition-transform" onClick={() => setShowFollowList({ title: 'Following', type: 'following' })}>
                         <p className="text-2xl font-black tracking-tight">{followingIds.size}</p>
                         <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Following</p>
                       </div>
                    </div>
                    <p className="max-w-2xl text-gray-600 dark:text-gray-400 font-medium leading-relaxed mb-12">{currentUser.bio}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-6">
                      {posts.filter(p => p.user.id === currentUser.id).length > 0 ? (
                        posts.filter(p => p.user.id === currentUser.id).map(p => (
                          <div 
                            key={p.id} 
                            onClick={() => setSelectedPostDetail(p)}
                            className="aspect-square rounded-2xl md:rounded-[2rem] overflow-hidden bg-gray-100 dark:bg-slate-800 group relative cursor-pointer"
                          >
                            <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                            <div className="absolute inset-0 bg-brand-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"> 
                              <div className="flex items-center text-white space-x-2"><ICONS.Heart className="w-6 h-6 fill-current" /><span className="font-bold">{p.likes}</span></div> 
                            </div>
                          </div>
                        ))
                      ) : ( <div className="col-span-full py-20 text-center opacity-30 border-2 border-dashed dark:border-slate-800 rounded-[3rem]"> <ICONS.Create className="w-16 h-16 mx-auto mb-4" /> <p className="font-bold">No moments found.</p> </div> )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
          <Navbar onTabChange={handleTabChange} activeTab={activeTab} hiddenOnMobile={selectedChatUser !== null && activeTab === 'chat'} />
          {showMenu && <Sidebar isOpen={showMenu} onClose={() => setShowMenu(false)} user={currentUser} onLogout={() => supabase.auth.signOut()} onThemeToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')} onSavedClick={() => { setActiveTab('saved'); setShowMenu(false); }} currentTheme={theme} />}
          {showCreateModal && <CreatePostModal onClose={() => setShowCreateModal(false)} onPost={async (img, cap) => { await supabase.from('posts').insert({ user_id: currentUser.id, image_url: img, caption: cap }); fetchPosts(); setActiveTab('home'); }} />}
          {showCreateStoryModal && <CreateStoryModal onClose={() => setShowCreateStoryModal(false)} onPost={handlePostStory} />}
          {showEditProfileModal && currentUser && <EditProfileModal user={currentUser} onClose={() => setShowEditProfileModal(false)} onUpdate={handleUpdateProfile} />}
          {activeStory && <StoryViewer story={activeStory} onClose={() => setActiveStory(null)} />}
          {selectedPostDetail && (
            <PostDetailModal 
              post={selectedPostDetail} 
              currentUser={currentUser} 
              onClose={() => setSelectedPostDetail(null)} 
              onLike={handleLike} 
              onSave={handleSavePost}
              onOpenComments={setViewingCommentsPost}
            />
          )}
          {showFollowList && (
            <FollowListModal 
              title={showFollowList.title} 
              onClose={() => setShowFollowList(null)} 
              users={showFollowList.type === 'following' ? allUsers.filter(u => followingIds.has(u.id)) : []} 
              onUserClick={handleStartChat}
            />
          )}
          {viewingCommentsPost && <CommentPage post={viewingCommentsPost} currentUser={currentUser} onClose={() => setViewingCommentsPost(null)} onAddComment={async (pid, txt) => { 
            await supabase.from('comments').insert({ post_id: pid, user_id: currentUser.id, text: txt }); 
            
            // Add local alert for comment
            addLocalAlert({
              type: 'comment',
              user: { id: currentUser.id, username: 'Someone', avatar: currentUser.avatar },
              content: txt,
              postId: pid
            });
            
            fetchPosts(); 
          }} />}
        </div>
      </div>
    </Router>
  );
};

export default App;
