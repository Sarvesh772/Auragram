import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Plus, X, Loader2, Trash2, ChevronLeft, ChevronRight, Eye, 
  Crop, Type, RotateCw, Wand2, ZoomIn, ZoomOut, Move, Send
} from 'lucide-react';

export default function Story({ session, onSelectUser }) {
  const [storiesGrouped, setStoriesGrouped] = useState([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyUploading, setStoryUploading] = useState(false);

  // Photo Editor States
  const [selectedRawFile, setSelectedRawFile] = useState(null);
  const [editImageSrc, setEditImageSrc] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('text'); // 'text', 'crop', 'filter'

  // Text & Dragging States
  const [storyText, setStoryText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textBg, setTextBg] = useState(true);
  const [textFontSize, setTextFontSize] = useState(48);
  const [textFont, setTextFont] = useState('sans-serif');
  const [storyPrivacy, setStoryPrivacy] = useState('public');
  const [closeFriendsText, setCloseFriendsText] = useState('');
  const [showPrivacyPrompt, setShowPrivacyPrompt] = useState(false);
  const [showCloseFriendsPicker, setShowCloseFriendsPicker] = useState(false);
  const [closeFriendProfiles, setCloseFriendProfiles] = useState([]);
  const [selectedCloseFriends, setSelectedCloseFriends] = useState([]);
  const [textPos, setTextPos] = useState({ x: 50, y: 50 }); // Percentage position (50% X, 50% Y)
  const [isDraggingText, setIsDraggingText] = useState(false);

  // Zoom & Crop States
  const [zoomScale, setZoomScale] = useState(1); // 1x to 2.5x
  const [filterStyle, setFilterStyle] = useState('normal'); // 'normal', 'grayscale', 'sepia', 'bright', 'vintage'
  const [rotation, setRotation] = useState(0);

  // Story Viewers Drawer States
  const [viewersList, setViewersList] = useState([]);
  const [showViewersDrawer, setShowViewersDrawer] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const storyFileInputRef = useRef(null);
  const previewAreaRef = useRef(null);

  const currentGroup = activeGroupIndex !== null ? storiesGrouped[activeGroupIndex] : null;
  const currentStory = currentGroup?.stories[activeStoryIndex];

  // Auto Advance Image Story (5s)
  useEffect(() => {
    if (!currentStory || currentStory.media_type === 'video' || isPaused || showViewersDrawer) return undefined;
    const timer = setTimeout(() => handleNextStory(), 5000);
    return () => clearTimeout(timer);
  }, [activeGroupIndex, activeStoryIndex, currentStory?.id, isPaused, showViewersDrawer]);

  useEffect(() => {
    if (currentStory) {
      if (currentStory.user_id !== session?.user?.id) {
        recordStoryView(currentStory.id);
      }
      fetchStoryViewers(currentStory.id);
    }
  }, [currentStory?.id]);

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

  async function recordStoryView(storyId) {
    if (!session?.user?.id) return;
    await supabase.from('story_views').upsert(
      [{ story_id: storyId, viewer_id: session.user.id }],
      { onConflict: 'story_id,viewer_id' }
    );
  }

  async function fetchStoryViewers(storyId) {
    const { data: views } = await supabase
      .from('story_views')
      .select('viewer_id')
      .eq('story_id', storyId);

    if (views && views.length > 0) {
      const viewerIds = views.map(v => v.viewer_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', viewerIds);
      setViewersList(profiles || []);
    } else {
      setViewersList([]);
    }
  }

  function handleFileSelected(e) {
    const files = Array.from(e.target.files || []);
    const file = files[0];
    if (!file) return;

    if (files.length > 1) {
      files.forEach((item) => {
        const type = item.type.startsWith('video') ? 'video' : 'image';
        uploadStoryFile(item, type, null);
      });
      e.target.value = '';
      return;
    }

    const isVideo = file.type.startsWith('video');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

    if ((!file.type.startsWith('image') && !isVideo) || file.size > maxSize) {
      alert(`Choose a valid ${isVideo ? 'video (max 50MB)' : 'image (max 10MB)'}.`);
      e.target.value = '';
      return;
    }

    if (isVideo) {
      uploadStoryFile(file, 'video', null);
    } else {
      setSelectedRawFile(file);
      const url = URL.createObjectURL(file);
      setEditImageSrc(url);
      setIsEditing(true);
      // Reset Editor Setup
      setStoryText('');
      setTextPos({ x: 50, y: 50 });
      setZoomScale(1);
      setFilterStyle('normal');
      setRotation(0);
    }
  }

  // Handle Text Dragging Movement
  function handleDragStart(e) {
    setIsDraggingText(true);
  }

  function handleDragMove(e) {
    if (!isDraggingText || !previewAreaRef.current) return;

    const rect = previewAreaRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let posX = ((clientX - rect.left) / rect.width) * 100;
    let posY = ((clientY - rect.top) / rect.height) * 100;

    posX = Math.max(5, Math.min(95, posX));
    posY = Math.max(5, Math.min(95, posY));

    setTextPos({ x: posX, y: posY });
  }

  function handleDragEnd() {
    setIsDraggingText(false);
  }

  // Render Editor State to Final Image Blob
  function handleShareClick() {
    setShowPrivacyPrompt(true);
  }

  function confirmSharePrivacy(privacy) {
    setStoryPrivacy(privacy);
    setShowPrivacyPrompt(false);
    setTimeout(() => handleFinishEditingAndUpload(), 0);
  }

  async function openCloseFriendsPicker() {
    const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url').neq('id', session.user.id).order('full_name');
    setCloseFriendProfiles(data || []);
    setSelectedCloseFriends([]);
    setShowPrivacyPrompt(false);
    setShowCloseFriendsPicker(true);
  }

  function confirmCloseFriendsShare() {
    if (!selectedCloseFriends.length) return;
    setStoryPrivacy('close_friends');
    setShowCloseFriendsPicker(false);
    setTimeout(() => handleFinishEditingAndUpload(), 0);
  }

  async function handleFinishEditingAndUpload() {
    if (!editImageSrc) return;

    setStoryUploading(true);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = editImageSrc;

    img.onload = async () => {
      canvas.width = 1080;
      canvas.height = 1920; // 9:16 Story Aspect Ratio

      // Background Fill
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw & Transform Image with Zoom and Rotation
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoomScale, zoomScale);

      // Apply Filter Effects
      if (filterStyle === 'grayscale') ctx.filter = 'grayscale(100%)';
      else if (filterStyle === 'sepia') ctx.filter = 'sepia(80%)';
      else if (filterStyle === 'bright') ctx.filter = 'brightness(120%) contrast(110%)';
      else if (filterStyle === 'vintage') ctx.filter = 'sepia(40%) contrast(120%) brightness(90%)';

      const imgAspect = img.width / img.height;
      const canvasAspect = canvas.width / canvas.height;
      let drawW, drawH;

      if (imgAspect > canvasAspect) {
        drawH = canvas.height;
        drawW = canvas.height * imgAspect;
      } else {
        drawW = canvas.width;
        drawH = canvas.width / imgAspect;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // Render Draggable Text onto Canvas
      if (storyText) {
        ctx.save();
        const renderX = (textPos.x / 100) * canvas.width;
        const renderY = (textPos.y / 100) * canvas.height;

        ctx.font = `bold ${textFontSize}px ${textFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (textBg) {
          const metrics = ctx.measureText(storyText);
          const padding = 24;
          const bgWidth = metrics.width + padding * 2;
          const bgHeight = 70;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.beginPath();
          ctx.roundRect(renderX - bgWidth / 2, renderY - bgHeight / 2, bgWidth, bgHeight, 20);
          ctx.fill();
        }

        ctx.fillStyle = textColor;
        ctx.fillText(storyText, renderX, renderY);
        ctx.restore();
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          uploadStoryFile(selectedRawFile, 'image', storyText);
          return;
        }
        const editedFile = new File([blob], `story_${Date.now()}.jpg`, { type: 'image/jpeg' });
          // Text is baked into the exported image; don't show it again as a bottom caption.
          await uploadStoryFile(editedFile, 'image', null);
        setIsEditing(false);
      }, 'image/jpeg', 0.92);
    };
  }

  async function uploadStoryFile(fileObj, mediaType, caption) {
    setStoryUploading(true);
    const fileExt = fileObj.name.split('.').pop();
    const filePath = `stories/${session.user.id}_${Date.now()}.${fileExt}`;

    const { error: uploadErr } = await supabase.storage
      .from('media')
      .upload(filePath, fileObj);

    if (uploadErr) {
      alert('Upload failed: ' + uploadErr.message);
      setStoryUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    const { error: storyInsertError } = await supabase.from('stories').insert([
      {
        user_id: session.user.id,
        media_url: urlData.publicUrl,
        media_type: mediaType,
        caption: caption || null,
        privacy: storyPrivacy
      },
    ]);

    if (storyInsertError) {
      alert('Story save failed: ' + storyInsertError.message);
      setStoryUploading(false);
      return;
    }

    setStoryUploading(false);
    setSelectedRawFile(null);
    setEditImageSrc(null);
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

  function handleProfileClick(userId) {
    setActiveGroupIndex(null);
    setShowViewersDrawer(false);
    if (onSelectUser) {
      onSelectUser(userId);
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*,video/*"
        multiple
        ref={storyFileInputRef}
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Stories Carousel */}
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-none items-center">
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

      {/* ======================================================== */}
      {/* 🎨 ADVANCED PHOTO EDITOR MODAL                           */}
      {/* ======================================================== */}
      {isEditing && editImageSrc && (
        <div 
          className="fixed inset-0 z-50 bg-black flex flex-col justify-between"
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          
          {/* Top Bar Controls */}
          <div className="p-4 flex justify-between items-center bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-20">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditImageSrc(null);
              }}
              className="p-2 text-slate-300 hover:text-white rounded-full bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('text')}
                className={`p-2.5 rounded-2xl flex items-center space-x-1.5 text-xs font-bold transition ${activeTab === 'text' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                <Type className="w-4 h-4" />
                <span className="hidden sm:inline">Text</span>
              </button>

              <button
                onClick={() => setActiveTab('crop')}
                className={`p-2.5 rounded-2xl flex items-center space-x-1.5 text-xs font-bold transition ${activeTab === 'crop' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                <Crop className="w-4 h-4" />
                <span className="hidden sm:inline">Zoom / Crop</span>
              </button>

              <button
                onClick={() => setActiveTab('filter')}
                className={`p-2.5 rounded-2xl flex items-center space-x-1.5 text-xs font-bold transition ${activeTab === 'filter' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                <Wand2 className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>

              <button
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="p-2.5 rounded-2xl bg-slate-800 text-slate-300 hover:text-white flex items-center text-xs font-bold"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleShareClick}
              disabled={storyUploading}
              className="bg-lime-400 hover:bg-lime-500 text-slate-950 px-3 sm:px-5 py-2 rounded-full text-xs font-extrabold flex items-center space-x-1 transition disabled:opacity-50"
            >
              {storyUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /><span className="hidden sm:inline">Share</span></>}
            </button>
          </div>

          {/* Interactive Workspace Canvas */}
          <div 
            ref={previewAreaRef}
            className="flex-1 min-h-0 flex items-center justify-center p-4 relative overflow-hidden bg-slate-950 select-none"
          >
            {/* Image Box */}
            <div 
              className="relative max-h-[65vh] max-w-full overflow-hidden transition-all duration-200"
              style={{
                transform: `rotate(${rotation}deg) scale(${zoomScale})`,
                filter: filterStyle === 'grayscale' ? 'grayscale(100%)' :
                        filterStyle === 'sepia' ? 'sepia(80%)' :
                        filterStyle === 'bright' ? 'brightness(120%) contrast(110%)' :
                        filterStyle === 'vintage' ? 'sepia(40%) contrast(120%) brightness(90%)' : 'none'
              }}
            >
              <img
                src={editImageSrc}
                alt="Edit"
                className="max-h-[65vh] w-auto object-contain rounded-2xl shadow-2xl pointer-events-none"
              />
            </div>

            {/* DRAGGABLE TEXT OVERLAY */}
            {storyText && (
              <div
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                style={{
                  left: `${textPos.x}%`,
                  top: `${textPos.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute z-30 cursor-move active:scale-105 transition-transform"
              >
                <div className="relative group">
                  <span
                    className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-2xl text-base md:text-lg font-bold shadow-2xl break-words max-w-[80vw] ${
                      textBg ? 'bg-black/70 backdrop-blur-md border border-white/20' : ''
                    }`}
                    style={{ color: textColor, fontSize: `${Math.max(14, textFontSize / 3)}px`, fontFamily: textFont }}
                  >
                    <Move className="w-3.5 h-3.5 text-white/50 inline-block mr-1" />
                    <span>{storyText}</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Tool Panels */}
          <div className="flex-shrink-0 max-h-[24dvh] overflow-y-auto p-3 sm:p-4 bg-slate-900 border-t border-slate-800 z-20 space-y-3">
            
            {/* Text Tab Panel */}
            {activeTab === 'text' && (
              <div className="space-y-3">
                <div className="flex space-x-2 items-center">
                  <input
                    type="text"
                    placeholder="Type text (Drag text on screen to move)..."
                    value={storyText}
                    onChange={(e) => setStoryText(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => setTextBg(!textBg)}
                    className={`px-3 py-2.5 rounded-2xl text-xs font-bold ${textBg ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    BG
                  </button>
                </div>
                <div className="flex gap-2">
                  <select value={textFont} onChange={(e) => setTextFont(e.target.value)} className="flex-1 bg-slate-800 text-white rounded-xl px-3 py-2 text-xs"><option value="sans-serif">Modern</option><option value="serif">Classic</option><option value="monospace">Mono</option></select>
                  <input aria-label="Text size" type="range" min="28" max="96" value={textFontSize} onChange={(e) => setTextFontSize(Number(e.target.value))} className="flex-1 accent-purple-500" />
                </div>

                {/* Color Palette */}
                <div className="flex space-x-3 overflow-x-auto pb-1 scrollbar-none justify-center">
                  {['#ffffff', '#f87171', '#fbbf24', '#34d399', '#60a5fa', '#c084fc', '#f472b6', '#000000'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setTextColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition ${textColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Crop & Zoom Tab Panel */}
            {activeTab === 'crop' && (
              <div className="space-y-3 max-w-xs mx-auto">
                <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                  <span className="flex items-center space-x-1"><ZoomOut className="w-4 h-4" /><span>Zoom</span></span>
                  <span>{Math.round(zoomScale * 100)}%</span>
                  <ZoomIn className="w-4 h-4" />
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="2.5"
                  step="0.05"
                  value={zoomScale}
                  onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <div className="flex justify-center space-x-3 pt-1">
                  <button
                    onClick={() => {
                      setZoomScale(1);
                      setRotation(0);
                    }}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl"
                  >
                    Reset Frame
                  </button>
                </div>
              </div>
            )}

            {/* Filter Tab Panel */}
            {activeTab === 'filter' && (
              <div className="flex justify-start sm:justify-center space-x-3 overflow-x-auto pb-1 scrollbar-none px-1">
                {[
                  { id: 'normal', name: 'Normal' },
                  { id: 'bright', name: 'Vibrant' },
                  { id: 'grayscale', name: 'B&W' },
                  { id: 'sepia', name: 'Sepia' },
                  { id: 'vintage', name: 'Vintage' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterStyle(f.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-bold border transition ${
                      filterStyle === f.id
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}


          </div>

        </div>
      )}

      {showPrivacyPrompt && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-slate-900 rounded-2xl p-4 space-y-3 border border-slate-700 shadow-2xl">
            <h3 className="text-white font-bold">Who can view?</h3>
            <button onClick={() => confirmSharePrivacy('public')} className="w-full text-left bg-slate-800 hover:bg-purple-600 text-white rounded-xl px-3 py-2 text-sm">Everyone</button>
            <button onClick={() => confirmSharePrivacy('followers')} className="w-full text-left bg-slate-800 hover:bg-purple-600 text-white rounded-xl px-3 py-2 text-sm">Followers</button>
            <button onClick={openCloseFriendsPicker} className="w-full text-left bg-slate-800 hover:bg-purple-600 text-white rounded-xl px-3 py-2 text-sm">Close friends</button>
            <button onClick={() => setShowPrivacyPrompt(false)} className="w-full text-slate-400 text-sm py-1">Cancel</button>
          </div>
        </div>
      )}

      {showCloseFriendsPicker && (
        <div className="fixed inset-0 z-[75] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm max-h-[75vh] bg-slate-900 rounded-2xl p-4 space-y-3 border border-slate-700 shadow-2xl flex flex-col">
            <h3 className="text-white font-bold">Choose close friends</h3>
            <div className="overflow-y-auto space-y-1 flex-1">
              {closeFriendProfiles.map((person) => {
                const selected = selectedCloseFriends.includes(person.id);
                return <button key={person.id} onClick={() => setSelectedCloseFriends((prev) => selected ? prev.filter((id) => id !== person.id) : [...prev, person.id])} className={`w-full flex items-center gap-3 p-2 rounded-xl text-left ${selected ? 'bg-purple-600/40' : 'bg-slate-800'}`}><div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">{(person.full_name || person.username || 'U')[0].toUpperCase()}</div><span className="text-white text-sm flex-1">{person.full_name || person.username}</span><span className="text-xs text-purple-200">{selected ? 'Selected' : 'Select'}</span></button>;
              })}
            </div>
            <button disabled={!selectedCloseFriends.length} onClick={confirmCloseFriendsShare} className="w-full bg-lime-400 disabled:opacity-40 text-slate-950 rounded-xl py-2 text-sm font-bold">Share to selected ({selectedCloseFriends.length})</button>
            <button onClick={() => setShowCloseFriendsPicker(false)} className="text-slate-400 text-sm py-1">Cancel</button>
          </div>
        </div>
      )}

      {/* Full-screen Native Story Modal */}
      {currentGroup && currentStory && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center md:p-4">
          
          <button
            onClick={() => setActiveGroupIndex(null)}
            className="hidden md:flex absolute top-6 right-6 bg-white/20 text-white p-2.5 rounded-full hover:bg-white/40 transition z-50"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={handlePrevStory}
            className="hidden md:flex absolute left-8 bg-white/20 text-white p-3 rounded-full hover:bg-white/40 transition z-50"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={handleNextStory}
            className="hidden md:flex absolute right-8 bg-white/20 text-white p-3 rounded-full hover:bg-white/40 transition z-50"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="relative w-full h-[100dvh] sm:h-[94dvh] sm:max-w-[min(100vw-1rem,28rem)] md:h-[90dvh] bg-slate-950 sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
            
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-30 p-4 pt-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
              <div className="flex space-x-1.5 mb-3">
                {currentGroup.stories.map((s, idx) => (
                  <div
                    key={s.id}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      idx === activeStoryIndex
                        ? 'bg-white'
                        : idx < activeStoryIndex
                        ? 'bg-white/70'
                        : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div 
                  onClick={() => handleProfileClick(currentGroup.userId)}
                  className="flex items-center space-x-3 cursor-pointer"
                >
                  {currentGroup.profile?.avatar_url ? (
                    <img
                      src={currentGroup.profile.avatar_url}
                      className="w-10 h-10 rounded-full object-cover border border-white/40"
                      alt="avatar"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm border border-white/40">
                      {(currentGroup.profile?.username || 'U')[0]?.toUpperCase()}
                    </div>
                  )}

                  <div>
                    <p className="text-white text-sm font-bold hover:underline">
                      {currentGroup.profile?.username || 'User'}
                    </p>
                    <p className="text-[11px] text-slate-300 font-medium">
                      {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {currentStory.user_id === session.user.id && (
                    <button
                      onClick={() => handleDeleteStory(currentStory.id)}
                      className="text-white/80 hover:text-rose-500 p-2 transition rounded-full"
                      title="Delete Story"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}

                  <button
                    onClick={() => setActiveGroupIndex(null)}
                    className="text-white/90 p-2 hover:bg-white/10 rounded-full transition"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Media Area (Tap & Hold to Pause) */}
            <div
              onMouseDown={() => setIsPaused(true)}
              onMouseUp={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                if (clickX < rect.width / 3) {
                  handlePrevStory();
                } else {
                  handleNextStory();
                }
              }}
              className="w-full h-full flex flex-col items-center justify-center bg-black cursor-pointer select-none relative"
            >
              {currentStory.media_type === 'video' ? (
                <video
                  src={currentStory.media_url}
                  autoPlay
                  controls={false}
                  playsInline
                  onEnded={handleNextStory}
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={currentStory.media_url}
                  alt="Story"
                  className="w-full h-full object-contain"
                />
              )}

              {/* Caption Overlay */}
              {currentStory.caption && (
                <div className="absolute bottom-16 left-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-2xl text-center z-20 border border-white/10">
                  <p className="text-white text-sm font-medium">{currentStory.caption}</p>
                </div>
              )}
            </div>

            {/* Bottom Footer: Viewers Count */}
            {currentStory.user_id === session.user.id && (
              <div className="absolute bottom-4 left-4 z-30">
                <button
                  onClick={() => setShowViewersDrawer(true)}
                  className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3.5 py-2 rounded-full flex items-center space-x-2 border border-white/20 hover:bg-black/80 transition"
                >
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span>{viewersList.length} Viewers</span>
                </button>
              </div>
            )}

            {/* Viewers List Drawer */}
            {showViewersDrawer && (
              <div className="absolute inset-x-0 bottom-0 z-40 bg-slate-900 border-t border-slate-800 rounded-t-3xl p-4 max-h-[60vh] overflow-y-auto space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <h4 className="text-white text-sm font-bold flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-purple-400" />
                    <span>Story Viewers ({viewersList.length})</span>
                  </h4>
                  <button onClick={() => setShowViewersDrawer(false)} className="text-slate-400 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {viewersList.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No views yet.</p>
                ) : (
                  viewersList.map((viewer) => (
                    <div
                      key={viewer.id}
                      onClick={() => handleProfileClick(viewer.id)}
                      className="flex items-center space-x-3 p-2 hover:bg-slate-800 rounded-2xl cursor-pointer transition"
                    >
                      {viewer.avatar_url ? (
                        <img src={viewer.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="v-avatar" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                          {(viewer.username || 'U')[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-white text-xs font-bold">@{viewer.username || 'user'}</p>
                        <p className="text-[10px] text-slate-400">{viewer.full_name || 'Auragram Member'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
