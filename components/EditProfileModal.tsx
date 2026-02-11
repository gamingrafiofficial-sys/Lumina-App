
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { ICONS } from '../constants';

interface EditProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdate: (updatedData: Partial<User>) => Promise<void>;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    fullName: user.fullName,
    bio: user.bio || '',
    work: user.work || '',
    location: user.location || '',
    website: user.website || '',
    avatar: user.avatar,
    coverPhoto: user.coverPhoto || ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'coverPhoto') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setFormData(prev => ({ ...prev, [type]: reader.result as string })); };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    await onUpdate(formData);
    setIsUpdating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] md:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-8">
        <div className="flex items-center justify-between p-6 border-b dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
          <button onClick={onClose} className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
          <h2 className="font-black text-xl tracking-tight">Edit Identity</h2>
          <button onClick={handleSubmit} disabled={isUpdating} className="px-6 py-2 bg-brand-gradient text-white rounded-xl font-black text-sm shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
            {isUpdating ? 'Saving...' : 'Save'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar pb-12">
          <div className="relative h-48 md:h-56 group bg-gray-100 dark:bg-slate-800">
            <img src={formData.coverPhoto || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop'} className="w-full h-full object-cover opacity-80" alt="Cover" />
            <button onClick={() => coverInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30 text-white font-bold text-xs uppercase tracking-widest">Change Cover Photo</div>
            </button>
            <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'coverPhoto')} />
            <div className="absolute -bottom-12 left-8 group">
              <div className="relative">
                <img src={formData.avatar} className="w-28 h-28 md:w-32 md:h-32 rounded-[2.5rem] border-4 border-white dark:border-slate-900 shadow-2xl object-cover" alt="Avatar" />
                <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity"><ICONS.Magic className="w-8 h-8 text-white" /></button>
              </div>
              <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'avatar')} />
            </div>
          </div>
          <div className="mt-16 px-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Display Name</label>
              <input type="text" className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Bio</label>
              <textarea className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-brand-primary outline-none transition-all h-32 resize-none leading-relaxed" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Occupation</label>
                <div className="relative">
                  <ICONS.Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all" value={formData.work} onChange={(e) => setFormData({ ...formData, work: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Location</label>
                <div className="relative">
                  <ICONS.MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Website</label>
              <div className="relative">
                <ICONS.Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="url" className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
