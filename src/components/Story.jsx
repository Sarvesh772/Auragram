import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, X, Loader2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Story({ session }) {
  const [storiesGrouped, setStoriesGrouped] = useState([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyUploading, setStoryUploading] = useState(false);
  const storyFileInputRef = useRef(null);
  const currentGroup = activeGroupIndex !== null ? storiesGrouped[activeGroupIndex] : null;
  const currentStory = currentGroup?.stories[activeStoryIndex];

  // Instagram-style auto advance for image stories.
  useEffect(() => {
    if (!currentStory || currentStory.media_type === 'video') return undefined;
    const timer = setTimeout(() => handleNextStory(), 5000);
    return () => clearTimeout(timer);
  }, [activeGroupIndex, activeStoryIndex, currentStory?.id]);

  // Keyboard navigation while the viewer is open.
  useEffect(() => {
    if (!currentStory) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setActiveGroupIndex(null);
      if (event.key === 'ArrowRight') handleNextStory();
      if (event.key === 'ArrowLeft') handlePrevStory();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentStory?.id, activeGroupIndex, activeStoryIndex, storiesGrouped.length]);

  useEffect(() => {
    fetchActiveStories();
  }, []);

  async function fetchActiveStories() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: storiesData, error } = await supabase
      .from('stories')
      .select('*')
      .gt('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: true });

    if (error || !storiesData || storiesData.length === 0) {
      setStoriesGrouped([]);
      return;
    }

    const userIds = [...new Set(storiesData.map((s) => s.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    const profilesMap = (profiles || []).reduce(
      (acc, p) => ({ ...acc, [p.id]: p }),
      {}
    );

    const grouped = userIds.map((uid) => ({
      userId: uid,
      profile: profilesMap[uid] || null,
      stories: storiesData.filter((s) => s.user_id === uid),
    }));

    setStoriesGrouped(grouped);
  }

  async function handleStoryUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if ((!file.type.startsWith('image') && !isVideo) || file.size > maxSize) {
      alert(`Please choose a valid ${isVideo ? 'video (max 50MB)' : 'image (max 10MB)'}.`);
      e.target.value = '';
      return;
    }

    setStoryUploading(true);
    const mediaType = isVideo ? 'video' : 'image';
    const fileExt = file.name.split('.').pop();
    const filePath = `stories/${session.user.id}_${Date.now()}.${fileExt}`;

    const { error: uploadErr } = await supabase.storage
      .from('media')
      .upload(filePath, file);

    if (uploadErr) {
      alert('Story upload failed: ' + uploadErr.message);
      setStoryUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    await supabase.from('stories').insert([
      {
        user_id: session.user.id,
        media_url: urlData.publicUrl,
        media_type: mediaType,
      },
    ]);

    setStoryUploading(false);
    if (storyFileInputRef.current) storyFileInputRef.current.value = '';
    fetchActiveStories();
  }

  async function handleDeleteStory(storyId) {
    const { error } = await supabase.from('stories').delete().eq('id', storyId);
    if (!error) {
      fetchActiveStories();
      setActiveGroupIndex(null);
    }
  }

  function handleNextStory() {
    if (!currentGroup) return;
    if (activeStoryIndex < currentGroup.stories.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
    } else if (activeGroupIndex < storiesGrouped.length - 1) {
      setActiveGroupIndex((prev) => prev + 1);
      setActiveStoryIndex(0);
    } else {
      setActiveGroupIndex(null);
    }
  }

  function handlePrevStory() {
    if (!currentGroup) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => prev - 1);
    } else if (activeGroupIndex > 0) {
      setActiveGroupIndex((prev) => prev - 1);
      setActiveStoryIndex(storiesGrouped[activeGroupIndex - 1].stories.length - 1);
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*,video/*"
        ref={storyFileInputRef}
        onChange={handleStoryUpload}
        className="hidden"
      />

      {/* Stories Carousel Bar */}
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-none items-center">
        {/* Upload Story Button */}
        <div
          onClick={() => storyFileInputRef.current?.click()}
          className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
        >
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-purple-500 flex items-center justify-center bg-purple-50 group-hover:bg-purple-100 transition relative">
            {storyUploading ? (
              <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
            ) : (
              <Plus className="w-6 h-6 text-purple-600" />
            )}
          </div>
          <span className="text-xs mt-1 text-slate-500 font-medium">Your Story</span>
        </div>

        {/* Active Stories List */}
        {storiesGrouped.map((group, groupIdx) => {
          const userAvatar = group.profile?.avatar_url;
          const username = group.profile?.username || 'User';

          return (
            <div
              key={group.userId}
              onClick={() => {
                setActiveGroupIndex(groupIdx);
                setActiveStoryIndex(0);
              }}
              className="flex flex-col items-center flex-shrink-0 cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-amber-500 via-purple-600 to-pink-500">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    className="w-full h-full rounded-full object-cover border-2 border-white"
                    alt={username}
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm border-2 border-white">
                    {username[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-xs mt-1 text-slate-600 font-medium truncate w-16 text-center">
                {username}
              </span>
            </div>
          );
        })}
      </div>

      {/* Full-screen Story Modal */}
      {currentGroup && currentStory && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 md:p-4">
          <button
            onClick={() => setActiveGroupIndex(null)}
            className="absolute top-4 right-4 bg-white/20 text-white p-2 rounded-full hover:bg-white/40 transition z-50"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={handlePrevStory}
            className="absolute left-4 bg-white/20 text-white p-2 rounded-full hover:bg-white/40 transition z-50 hidden md:block"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={handleNextStory}
            className="absolute right-16 md:right-20 bg-white/20 text-white p-2 rounded-full hover:bg-white/40 transition z-50 hidden md:block"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="relative max-w-sm w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
            {/* Story Progress Bars */}
            <div className="absolute top-3 left-3 right-3 flex space-x-1 z-20">
              {currentGroup.stories.map((s, idx) => (
                <div
                  key={s.id}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    idx === activeStoryIndex
                      ? 'bg-white'
                      : idx < activeStoryIndex
                      ? 'bg-white/60'
                      : 'bg-white/20'
                  }`}
                />
              ))}
            </div>

            {/* Story Header (Profile DP + Username) */}
            <div className="p-4 pt-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
              <div className="flex items-center space-x-3">
                {currentGroup.profile?.avatar_url ? (
                  <img
                    src={currentGroup.profile.avatar_url}
                    className="w-10 h-10 rounded-full object-cover border border-white/50"
                    alt="profile dp"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm border border-white/50">
                    {(currentGroup.profile?.username || 'U')[0]?.toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="text-white text-xs font-bold">
                    {currentGroup.profile?.username || 'User'}
                  </p>
                  <p className="text-[10px] text-slate-300">
                    24h Story • {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {currentStory.user_id === session.user.id && (
                <button
                  onClick={() => handleDeleteStory(currentStory.id)}
                  className="text-slate-300 hover:text-rose-500 p-2 transition"
                  title="Delete Story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Story Content View */}
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                if (clickX < rect.width / 2) {
                  handlePrevStory();
                } else {
                  handleNextStory();
                }
              }}
              className="h-[520px] flex items-center justify-center bg-black cursor-pointer select-none"
            >
              {currentStory.media_type === 'video' ? (
                <video
                  src={currentStory.media_url}
                  autoPlay
                  controls
                  playsInline
                  onEnded={handleNextStory}
                  className="max-h-full w-full object-contain"
                />
              ) : (
                <img
                  src={currentStory.media_url}
                  alt="Story"
                  className="max-h-full w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
