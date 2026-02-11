
import React, { useEffect, useState } from 'react';
import { Story } from '../types';

interface StoryViewerProps {
  story: Story;
  onClose: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ story, onClose }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 5000; // 5 seconds
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          onClose();
          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[500] bg-black flex items-center justify-center animate-in fade-in zoom-in-95 duration-300">
      {/* Immersive Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img 
          src={story.imageUrl} 
          className="w-full h-full object-cover blur-3xl opacity-40 scale-110" 
          alt=""
        />
      </div>

      <div className="relative w-full h-full max-w-md flex flex-col shadow-2xl">
        {/* Progress Bar Container */}
        <div className="absolute top-0 left-0 right-0 p-4 z-20 flex space-x-1 pt-[calc(1.5rem+env(safe-area-inset-top))]">
           <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
             <div 
               className="h-full bg-white transition-all duration-75 ease-linear" 
               style={{ width: `${progress}%` }}
             ></div>
           </div>
        </div>

        {/* User Info Overlay */}
        <div className="absolute top-10 left-4 right-4 z-20 flex items-center justify-between pt-[calc(1.5rem+env(safe-area-inset-top))]">
           <div className="flex items-center space-x-3">
             <div className="w-10 h-10 rounded-full border-2 border-white p-0.5">
               <img src={story.user.avatar} className="w-full h-full rounded-full object-cover bg-slate-800" />
             </div>
             <div>
               <p className="text-white font-black text-sm drop-shadow-md">{story.user.username}</p>
               <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Story Moment</p>
             </div>
           </div>
           <button 
             onClick={onClose} 
             className="p-2 bg-black/20 backdrop-blur-md text-white hover:bg-black/40 rounded-full transition-colors active:scale-90"
           >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
           </button>
        </div>

        {/* Story Content Area */}
        <div className="flex-1 flex items-center justify-center bg-transparent px-2">
           <img 
             src={story.imageUrl} 
             className="w-full max-h-[85vh] object-contain rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)]" 
             alt="Story moment"
           />
        </div>

        {/* Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/60 to-transparent flex justify-center pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center space-x-8">
            <button className="text-white/80 hover:text-white transition-colors active:scale-125">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
            </button>
            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
               <p className="text-white text-[10px] font-bold tracking-widest uppercase">Send a reaction</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryViewer;
