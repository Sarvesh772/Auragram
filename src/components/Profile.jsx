import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  FileText, Image as ImageIcon, Film, Heart, MessageCircle, 
  Send, Bookmark, Edit3, X, Sparkles, Loader2, Camera, AlertCircle, CheckCircle2 
} from 'lucide-react';

export default function Profile({ session, profileUserId }) {
  const viewedUserId = profileUserId || session.user.id;
  const isOwnProfile = viewedUserId === session.user.id;
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('text'); // 'text', 'photos', 'reels'
  const [loading, setLoading] = useState(true);

  // Modal View State
  const [selectedPost, setSelectedPost] = useState(null);
  const [postComments, setPostComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchProfileAndPosts();
  }, [session, viewedUserId]);

  async function fetchProfileAndPosts() {
    setLoading(true);

    // Fetch user profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', viewedUserId)
      .single();

    if (profileData) {
      setProfile(profileData);
      setFullName(profileData.full_name || '');
      setUsername(profileData.username || '');
      setBio(profileData.bio || '');
      setAvatarUrl(profileData.avatar_url || '');
    }

    // Fetch user posts
    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', viewedUserId)
      .order('created_at', { ascending: false });

    // Fetch Likes and Comments for user posts
    const postIds = (postsData || []).map(p => p.id);
    let likesData = [];
    let commentsData = [];

    if (postIds.length > 0) {
      const [lRes, cRes] = await Promise.all([
        supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
        supabase.from('comments').select('id, post_id').in('post_id', postIds)
      ]);
      likesData = lRes.data || [];
      commentsData = cRes.data || [];
    }

    const formattedPosts = (postsData || []).map(post => ({
      ...post,
      profiles: profileData,
      likes: likesData.filter(l => l.post_id === post.id),
      commentsCount: commentsData.filter(c => c.post_id === post.id).length
    }));

    setPosts(formattedPosts);
    setLoading(false);
  }

  // Open Post Modal & Fetch Comments
  async function handleOpenPost(post) {
    setSelectedPost(post);
    setLoadingComments(true);

    const { data: commentsData } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (commentsData && commentsData.length > 0) {
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: cProfiles } = await supabase.from('profiles').select('*').in('id', userIds);
      const cProfilesMap = (cProfiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

      setPostComments(commentsData.map(c => ({ ...c, profiles: cProfilesMap[c.user_id] || null })));
    } else {
      setPostComments([]);
    }

    setLoadingComments(false);
  }

  // Add Comment inside Modal
  async function handleAddComment() {
    if (!newComment.trim() || !selectedPost) return;

    const { data, error } = await supabase
      .from('comments')
      .insert([{ post_id: selectedPost.id, user_id: session.user.id, content: newComment.trim() }])
      .select()
      .single();

    if (!error && data) {
      const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setPostComments([...postComments, { ...data, profiles: myProfile }]);
      setNewComment('');
      
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, commentsCount: p.commentsCount + 1 } : p));
    }
  }

  // Avatar Upload Handler
  async function handleAvatarUpload(e) {
    try {
      setUploadingAvatar(true);
      setErrorMsg('');

      const file = e.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrlData.publicUrl);
    } catch (error) {
      setErrorMsg('Avatar upload failed: ' + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  // Update Profile Info with Unique Username Validation
  async function handleUpdateProfile(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');

    if (!cleanUsername) {
      setErrorMsg('Username cannot be empty');
      return;
    }

    try {
      setSaving(true);

      // Check unique username if username is changed
      if (cleanUsername !== profile?.username?.toLowerCase()) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', cleanUsername)
          .neq('id', session.user.id)
          .maybeSingle();

        if (existingUser) {
          setErrorMsg(`Username @${cleanUsername} is already taken!`);
          setSaving(false);
          return;
        }
      }

      const updates = {
        id: session.user.id,
        full_name: fullName.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        avatar_url: avatarUrl,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) throw error;

      setProfile(updates);
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        setIsEditing(false);
        setSuccessMsg('');
      }, 1000);

    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setSaving(false);
    }
  }

  // Filter Posts by Category
  const textPosts = posts.filter(p => !p.media_url);
  const photoPosts = posts.filter(p => p.media_url && p.media_type !== 'video');
  const reelPosts = posts.filter(p => p.media_url && p.media_type === 'video');

  return (
    <div className="w-full max-w-2xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-20 box-border overflow-x-hidden">
      {/* Profile Header Card */}
      {profile && (
        <div className="bg-slate-50 border border-slate-100 dark:bg-slate-900 dark:border-slate-800 p-4 sm:p-6 rounded-3xl space-y-4 shadow-sm w-full box-border">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            
            {/* Avatar & Info */}
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-xl sm:text-2xl shadow-md overflow-hidden flex-shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  (profile.full_name || profile.username || 'U')[0].toUpperCase()
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-xl font-black text-slate-800 dark:text-white truncate">
                  {profile.full_name || profile.username || 'User'}
                </h2>
                <p className="text-xs font-bold text-purple-600 dark:text-purple-400 truncate">@{profile.username || 'username'}</p>
                {profile.bio && <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5 line-clamp-2">{profile.bio}</p>}
              </div>
            </div>

            {/* Edit Button */}
              {isOwnProfile && <button 
                onClick={() => setIsEditing(true)}
              className="flex items-center space-x-1 sm:space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-300 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition flex-shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5 text-purple-600" />
              <span>Edit</span>
            </button>}
          </div>

          {/* Stats Bar */}
          <div className="flex justify-around items-center border-t border-slate-200/60 dark:border-slate-800 pt-3 text-xs font-extrabold text-slate-600 dark:text-slate-400 text-center">
            <div><span className="text-purple-600 font-black block sm:inline sm:mr-1">{posts.length}</span> Posts</div>
            <div><span className="text-purple-600 font-black block sm:inline sm:mr-1">{textPosts.length}</span> Thoughts</div>
            <div><span className="text-purple-600 font-black block sm:inline sm:mr-1">{photoPosts.length + reelPosts.length}</span> Media</div>
          </div>
        </div>
      )}

      {/* TABS HEADER: Text | Photos | Reels */}
      <div className="w-full flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
        {[
          { id: 'text', label: 'Text', icon: FileText, count: textPosts.length },
          { id: 'photos', label: 'Photos', icon: ImageIcon, count: photoPosts.length },
          { id: 'reels', label: 'Reels', icon: Film, count: reelPosts.length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 flex items-center justify-center space-x-1.5 border-b-2 transition ${
                isActive 
                  ? 'border-purple-600 text-purple-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* CONTENT AREA */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. TEXT TAB */}
          {activeTab === 'text' && (
            textPosts.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-12 font-medium">No text thoughts posted yet.</p>
            ) : (
              textPosts.map(post => (
                <div key={post.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden flex-shrink-0">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        (profile?.full_name || profile?.username || 'U')[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">{profile?.full_name || profile?.username || 'User'}</h4>
                      <p className="text-[10px] text-slate-400">{new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>

                  <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-2.5 text-slate-500 text-xs font-semibold">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 hover:text-purple-600 cursor-pointer">
                        <Heart className="w-4 h-4" />
                        <span>{post.likes?.length || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1 hover:text-purple-600 cursor-pointer" onClick={() => handleOpenPost(post)}>
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.commentsCount || 0}</span>
                      </div>
                      <Send className="w-4 h-4 hover:text-purple-600 cursor-pointer" />
                    </div>
                    <Bookmark className="w-4 h-4 hover:text-purple-600 cursor-pointer" />
                  </div>
                </div>
              ))
            )
          )}

          {/* 2. PHOTOS TAB */}
          {activeTab === 'photos' && (
            photoPosts.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-12 font-medium">No photo posts found.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {photoPosts.map(post => (
                  <div 
                    key={post.id} 
                    onClick={() => handleOpenPost(post)}
                    className="relative group aspect-square rounded-2xl overflow-hidden bg-slate-100 cursor-pointer"
                  >
                    <img src={post.media_url} alt="photo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white space-x-3 font-bold text-xs">
                      <div className="flex items-center space-x-1"><Heart className="w-4 h-4 fill-white" /><span>{post.likes?.length || 0}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* 3. REELS TAB */}
          {activeTab === 'reels' && (
            reelPosts.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-12 font-medium">No video reels uploaded.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {reelPosts.map(post => (
                  <div 
                    key={post.id} 
                    onClick={() => handleOpenPost(post)}
                    className="relative group aspect-[9/16] rounded-2xl overflow-hidden bg-black cursor-pointer"
                  >
                    <video src={post.media_url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white space-x-3 font-bold text-xs">
                      <div className="flex items-center space-x-1"><Heart className="w-4 h-4 fill-white" /><span>{post.likes?.length || 0}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* POPUP MODAL FOR TAP TO VIEW MEDIA/REELS */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col md:flex-row relative shadow-2xl my-auto">
            {/* Close Button */}
            <button 
              onClick={() => setSelectedPost(null)}
              className="absolute top-3 right-3 bg-black/60 hover:bg-black text-white p-1.5 rounded-full z-20 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Left Side: Media */}
            <div className="md:w-1/2 bg-black flex items-center justify-center min-h-[220px] sm:min-h-[280px] max-h-[50vh] md:max-h-[85vh] relative overflow-hidden">
              {selectedPost.media_type === 'video' ? (
                <video src={selectedPost.media_url} controls autoPlay className="w-full h-full max-h-[50vh] md:max-h-[85vh] object-contain" />
              ) : (
                <img src={selectedPost.media_url} alt="post" className="w-full h-full max-h-[50vh] md:max-h-[85vh] object-contain" />
              )}
            </div>

            {/* Right Side: Details & Comments */}
            <div className="md:w-1/2 p-4 flex flex-col justify-between h-[320px] md:h-auto bg-white dark:bg-slate-900">
              <div className="space-y-3 overflow-hidden flex-1 flex flex-col">
                {/* User Info Header */}
                <div className="flex items-center space-x-2.5 border-b border-slate-100 dark:border-slate-800 pb-3 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden flex-shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      (profile?.full_name || profile?.username || 'U')[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white">{profile?.full_name || profile?.username}</h4>
                    <p className="text-[10px] text-slate-400">@{profile?.username}</p>
                  </div>
                </div>

                {/* Caption */}
                {selectedPost.content && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed flex-shrink-0">{selectedPost.content}</p>
                )}

                {/* Comments List */}
                <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comments</h5>
                  {loadingComments ? (
                    <p className="text-xs text-slate-400 py-4 text-center">Loading comments...</p>
                  ) : postComments.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No comments yet.</p>
                  ) : (
                    postComments.map(c => (
                      <div key={c.id} className="flex space-x-2 items-start text-xs">
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 font-bold flex items-center justify-center text-[10px] overflow-hidden flex-shrink-0">
                          {c.profiles?.avatar_url ? (
                            <img src={c.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            (c.profiles?.full_name || c.profiles?.username || 'U')[0].toUpperCase()
                          )}
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl flex-1">
                          <span className="font-bold text-[11px] text-slate-800 dark:text-white block">@{c.profiles?.username || 'user'}</span>
                          <span className="text-slate-600 dark:text-slate-300 text-[11px]">{c.content}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Comment Input */}
              <div className="flex items-center space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2 flex-shrink-0">
                <input 
                  type="text" 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-800 dark:text-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <button onClick={handleAddComment} className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL (WITH DP & UNIQUE USERNAME) */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 w-full max-w-md space-y-4 relative shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Edit Profile</h3>
            
            {/* Status alerts */}
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-red-50 text-red-600 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-3">
              
              {/* DP Change Section */}
              <div className="flex flex-col items-center space-y-1.5 pb-2">
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-purple-500/30 group">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg">
                      {fullName?.[0] || username?.[0] || 'U'}
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition">
                    <Camera className="w-5 h-5 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>
                <span className="text-[10px] text-purple-600 font-semibold cursor-pointer">
                  {uploadingAvatar ? 'Uploading...' : 'Tap Avatar to Change DP'}
                </span>
              </div>

              {/* Display Name */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Display Name / Full Name</label>
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name here"
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Unique Username */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Username (Must be Unique)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">@</span>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a unique username"
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Bio</label>
                <textarea 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  placeholder="Tell something about yourself..."
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <button 
                type="submit" 
                disabled={saving || uploadingAvatar}
                className="w-full bg-purple-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
