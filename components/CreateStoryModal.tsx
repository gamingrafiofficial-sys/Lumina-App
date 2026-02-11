
import React, { useState, useRef } from 'react';
import { ICONS } from '../constants';

interface CreateStoryModalProps {
  onClose: () => void;
  onPost: (imageUrl: string) => void;
}

const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ onClose, onPost }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (selectedImage) {
      onPost(selectedImage);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] overflow-hidden animate-in fade-in zoom-in duration-300 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-50 dark:border-slate-800">
          <button onClick={onClose} className="text-sm font-bold text-gray-400 dark:text-gray-500 hover:text-gray-600 px-2">Cancel</button>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 tracking-tight">Add to Story</h2>
          {selectedImage ? (
            <button onClick={handleSubmit} className="text-sm font-bold text-brand-primary dark:text-brand-secondary px-2 hover:brightness-110">Share</button>
          ) : (
            <div className="w-12"></div>
          )}
        </div>

        <div className="p-8">
          {!selectedImage ? (
            <div className="space-y-8 flex flex-col items-center py-10">
              <div className="w-24 h-24 bg-brand-gradient rounded-full flex items-center justify-center text-white shadow-xl animate-pulse-soft">
                <ICONS.Create className="w-10 h-10" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-gray-900 dark:text-gray-100">Capture the Moment</h3>
                <p className="text-gray-400 text-sm mt-2">Stories disappear after 24 hours.</p>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-5 px-6 bg-brand-primary text-white rounded-2xl font-black shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                Choose Photo
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="aspect-[9/16] bg-gray-50 dark:bg-slate-950 rounded-[2.5rem] overflow-hidden border-4 border-gray-100 dark:border-slate-800 shadow-2xl relative group">
                <img src={selectedImage} className="w-full h-full object-cover" />
                <button 
                  onClick={() => setSelectedImage(null)} 
                  className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                >
                  ✕
                </button>
              </div>
              <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">Previewing Story</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateStoryModal;
