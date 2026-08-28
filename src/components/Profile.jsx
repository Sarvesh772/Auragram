import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  FileText, Image as ImageIcon, Film, Heart, MessageCircle, 
  Send, Bookmark, Edit3, X, Sparkles, Loader2, Camera, AlertCircle, CheckCircle2, Pin, Play, Flag, MoreVertical, Copy, UserPlus, UserCheck, UserMinus
} from 'lucide-react';

export default function Profile({ session, profileUserId, onMessage }) {
  const [resolvedProfileId, setResolvedProfileId] = useState(null);
  const viewedUserId = resolvedProfileId || (profileUserId && /^[0-9a-f-]{36}$/i.test(profileUserId) ? profileUserId : session.user.id);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('text');
  const [loading, setLoading] = useState(true);
  // A username route (e.g. /profile/auragram) is resolved asynchronously;
  // treat it as our own profile once the loaded profile id matches the session.
  const isOwnProfile = viewedUserId === session.user.id || profile?.id === session.user.id;

  // Modal View State
  const [selectedPost, setSelectedPost] = useState(null);
  const [postComments, setPostComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [commentLikes, setCommentLikes] = useState([]);
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
  const [followState, setFollowState] = useState('none');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [listMode, setListMode] = useState(null);
  const [peopleList, setPeopleList] = useState([]);
  const [pinMessage, setPinMessage] = useState('');
  const [sharePost, setSharePost] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [safetyMessage, setSafetyMessage] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [profileLinkCopied, setProfileLinkCopied] = useState(false);
  const [reportPost, setReportPost] = useState(null);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDetails, setReportDetails] = useState('');

  function postShareUrl(post) {
    return `${window.location.origin}/?post=${encodeURIComponent(post.id)}`;
  }

  async function copyPostLink() {
    if (!sharePost) return;
    await navigator.clipboard?.writeText(postShareUrl(sharePost));
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1600);
  }

  async function nativeSharePost() {
    if (!sharePost) return;
    const url = postShareUrl(sharePost);
    if (navigator.share) await navigator.share({ title: 'Auragram post', text: sharePost.content || 'Check this post on Auragram', url });
    else await copyPostLink();
  }

  async function handleSafetyAction(action) {
    setSafetyOpen(false);
    let result = { error: null };
    if (action === 'report') result = await supabase.from('reports').insert([{ reporter_id: session.user.id, reported_user_id: viewedUserId, reason: 'Profile reported' }]);
    if (action === 'block') {
      if (isBlocked) result = await supabase.from('blocked_users').delete().eq('blocker_id', session.user.id).eq('blocked_id', viewedUserId);
      else result = await supabase.from('blocked_users').upsert([{ blocker_id: session.user.id, blocked_id: viewedUserId }]);
    }
    if (action === 'mute') result = await supabase.from('muted_users').upsert([{ muter_id: session.user.id, muted_id: viewedUserId }]);
    if (result.error) { setSafetyMessage(`${action} failed: ${result.error.message}`); setTimeout(() => setSafetyMessage(''), 3500); return; }
    if (action === 'block') setIsBlocked(!isBlocked);
    setSafetyMessage(action === 'report' ? 'Report submitted.' : action === 'block' ? (isBlocked ? 'User unblocked.' : 'User blocked.') : 'User muted.');
    setTimeout(() => setSafetyMessage(''), 2200);
  }

  async function submitPostReport() {
    if (!reportPost) return;
    const reason = reportReason === 'Other' ? reportDetails.trim() : reportReason;
    if (!reason) return;
    await supabase.from('reports').insert([{ reporter_id: session.user.id, reported_user_id: reportPost.user_id, post_id: reportPost.id, reason }]);
    setReportPost(null); setReportDetails(''); setSafetyMessage('Report submitted.'); setTimeout(() => setSafetyMessage(''), 2200);
  }

  async function copyProfileLink() {
    await navigator.clipboard?.writeText(`${window.location.origin}/profile/${profile?.username || viewedUserId}`);
    setProfileLinkCopied(true);
    setTimeout(() => setProfileLinkCopied(false), 1800);
  }

  useEffect(() => {
    fetchProfileAndPosts();
  }, [session, viewedUserId]);

  useEffect(() => { setResolvedProfileId(null); }, [profileUserId]);

  useEffect(() => {
    const refreshFollowStats = async () => {
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', viewedUserId),
        supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', viewedUserId)
      ]);
      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);
      if (viewedUserId !== session.user.id) {
        const { data: relation } = await supabase.from('follows').select('follower_id').or(`and(follower_id.eq.${session.user.id},following_id.eq.${viewedUserId}),and(follower_id.eq.${viewedUserId},following_id.eq.${session.user.id})`);
        const followingMe = (relation || []).some((r) => r.follower_id === viewedUserId);
        const followingThem = (relation || []).some((r) => r.follower_id === session.user.id);
        setFollowState(followingThem ? 'following' : followingMe ? 'followback' : 'none');
      }
    };
    const channel = supabase.channel(`profile-follows-${viewedUserId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, refreshFollowStats).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [viewedUserId]);

  async function openPeopleList(mode) {
    const column = mode === 'followers' ? 'follower_id' : 'following_id';
    const other = mode === 'followers' ? 'following_id' : 'follower_id';
    const { data } = await supabase.from('follows').select(`${other}`).eq(column, viewedUserId);
    const ids = (data || []).map((row) => row[other]);
    const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', ids) : { data: [] };
    setPeopleList(profiles || []); setListMode(mode);
  }

  async function fetchProfileAndPosts() {
    setLoading(true);

    let { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', viewedUserId)
      .single();
    if (!profileData) {
      const result = await supabase.from('profiles').select('*').eq('username', viewedUserId).maybeSingle();
      profileData = result.data;
    }
    const targetId = profileData?.id || viewedUserId;
    if (profileData?.id) setResolvedProfileId(profileData.id);
    if (targetId !== session.user.id) {
      const { data: blockRow } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', session.user.id).eq('blocked_id', targetId).maybeSingle();
      setIsBlocked(Boolean(blockRow));
    }

    if (profileData) {
      setProfile(profileData);
      if (window.location.pathname.startsWith('/profile/') && profileData.username) {
        window.history.replaceState({}, '', `/profile/${profileData.username}`);
      }
      setFullName(profileData.full_name || '');
      setUsername(profileData.username || '');
      setBio(profileData.bio || '');
      setAvatarUrl(profileData.avatar_url || '');
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', viewedUserId),
        supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', viewedUserId)
      ]);
      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);
      if (viewedUserId !== session.user.id) {
        const { data: relation } = await supabase.from('follows').select('follower_id, following_id').or(`and(follower_id.eq.${session.user.id},following_id.eq.${viewedUserId}),and(follower_id.eq.${viewedUserId},following_id.eq.${session.user.id})`);
        const following = (relation || []).some((r) => r.follower_id === session.user.id);
        const followedBack = (relation || []).some((r) => r.follower_id === viewedUserId);
        setFollowState(following ? 'following' : followedBack ? 'followback' : 'none');
      }
    }

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', targetId)
      .order('created_at', { ascending: false });

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

    const formattedPosts = (postsData || []).sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned)).map(post => ({
      ...post,
      profiles: profileData,
      likes: likesData.filter(l => l.post_id === post.id),
      commentsCount: commentsData.filter(c => c.post_id === post.id).length
    }));

    setPosts(formattedPosts);
    setLoading(false);
  }

  async function toggleFollow() {
    if (isOwnProfile || !profile) return;
    if (followState === 'following') {
      await supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', viewedUserId);
      setFollowState('none');
    } else {
      await supabase.from('follows').insert([{ follower_id: session.user.id, following_id: viewedUserId }]);
      setFollowState('following');
      await supabase.from('notifications').insert([{ recipient_id: viewedUserId, actor_id: session.user.id, type: 'follow', is_read: false }]);
    }
  }

  async function togglePinned(post) {
    if (!isOwnProfile) return;
    const { error } = await supabase.from('posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id).eq('user_id', session.user.id);
    if (!error) {
      const nextPinned = !post.is_pinned;
      setPosts((prev) => prev.map((item) => item.id === post.id ? { ...item, is_pinned: nextPinned } : item).sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned)));
      setPinMessage(nextPinned ? 'Post pinned to profile' : 'Post unpinned');
      setTimeout(() => setPinMessage(''), 1800);
    }
  }

  async function handleOpenPost(post) {
    setSelectedPost(post);
    setLoadingComments(true);

    const { data: commentsData } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    const { data: likesData } = await supabase.from('comment_likes').select('comment_id, user_id').eq('post_id', post.id);
    setCommentLikes(likesData || []);

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

  async function handleAddComment() {
    if (!newComment.trim() || !selectedPost) return;

    const replyPrefix = replyingTo?.profiles?.username ? `@${replyingTo.profiles.username} ` : '';
    const commentContent = `${replyPrefix}${newComment.trim()}`;
    const { data, error } = await supabase
      .from('comments')
      .insert([{ post_id: selectedPost.id, user_id: session.user.id, content: commentContent, parent_comment_id: replyingTo?.id || null }])
      .select()
      .single();

    if (!error && data) {
      const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setPostComments([...postComments, { ...data, profiles: myProfile }]);
      setNewComment('');
      setReplyingTo(null);
      
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, commentsCount: p.commentsCount + 1 } : p));
    }
  }

  async function toggleCommentLike(commentId) {
    const existing = commentLikes.find((like) => like.comment_id === commentId && like.user_id === session.user.id);
    if (existing) {
      await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', session.user.id);
      setCommentLikes((prev) => prev.filter((like) => like !== existing));
    } else {
      const { data } = await supabase.from('comment_likes').insert([{ comment_id: commentId, post_id: selectedPost.id, user_id: session.user.id }]).select().single();
      if (data) setCommentLikes((prev) => [...prev, data]);
    }
  }

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

  const textPosts = posts.filter(p => !p.media_url);
  const photoPosts = posts.filter(p => p.media_url && p.media_type !== 'video');
  const reelPosts = posts.filter(p => p.media_url && p.media_type === 'video');

  return (
    <div className="w-full max-w-2xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-20 box-border overflow-x-hidden">
      
      {/* Toast Messages */}
      {pinMessage && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl">{pinMessage}</div>}
      {safetyMessage && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl">{safetyMessage}</div>}
      {profileLinkCopied && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl">Profile link copied</div>}

{/* PROFILE HEADER CARD */}
{profile && (
  <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 rounded-3xl space-y-4 shadow-sm w-full box-border">
    
    {/* Right Side Action Buttons - Copy & Edit stacked vertically */}
    <div className="absolute top-3 right-3 flex flex-col gap-2">
      {/* Copy Profile Link Button */}
      <button 
        onClick={copyProfileLink} 
        className="rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 p-2 text-slate-500 hover:text-purple-600 transition-all hover:scale-110"
        title="Copy profile link"
      >
        <Copy className="w-4 h-4" />
      </button>
      
      {/* Edit Profile Button - Only for own profile */}
      {isOwnProfile && (
        <button 
          onClick={() => setIsEditing(true)}
          className="rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 p-2 text-slate-500 hover:text-purple-600 transition-all hover:scale-110"
          title="Edit profile"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      )}
    </div>

    {/* Profile Info Row */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      
      {/* Avatar & Name/Bio */}
      <div className="flex items-center space-x-4 min-w-0 flex-1">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-2xl shadow-md overflow-hidden flex-shrink-0 ring-2 ring-purple-500/20">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            (profile.full_name || profile.username || 'U')[0].toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white truncate">
            {profile.full_name || profile.username || 'User'}
          </h2>
          <p className="text-sm font-bold text-purple-600 dark:text-purple-400 truncate">
            @{profile.username || 'username'}
          </p>
          {profile.bio && (
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mt-1 break-words whitespace-normal leading-relaxed">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {/* Follow/Message Buttons - Only for other profiles */}
      {!isOwnProfile && (
        <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
          <button 
            onClick={toggleFollow}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
              followState === 'following' 
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600' 
                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-purple-500/25'
            }`}
          >
            {followState === 'following' ? 'Following' : followState === 'followback' ? 'Follow Back' : 'Follow'}
          </button>
          
          <button 
            onClick={() => onMessage?.(viewedUserId)} 
            className="px-4 py-2 rounded-full border border-purple-300 text-purple-600 text-sm font-bold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
          >
            Message
          </button>
          
          {/* More Options Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setSafetyOpen(v => !v)} 
              className="rounded-full border border-slate-200 dark:border-slate-700 p-2 text-slate-500 hover:text-slate-700 dark:hover:text-white transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {safetyOpen && (
              <div className="absolute right-0 top-11 z-20 w-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 shadow-xl">
                <button onClick={() => handleSafetyAction('block')} className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all">
                  {isBlocked ? 'Unblock user' : 'Block user'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* Stats Row */}
    <div className="grid grid-cols-3 gap-2 border-t border-slate-200/60 dark:border-slate-800 pt-3 text-center">
      <div>
        <b className="block text-sm font-bold text-purple-600">{posts.length}</b>
        <span className="text-[10px] text-slate-500 font-medium">Posts</span>
      </div>
      <button onClick={() => openPeopleList('followers')} className="hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl py-1 transition-all">
        <b className="block text-sm font-bold text-purple-600">{followersCount}</b>
        <span className="text-[10px] text-slate-500 font-medium">Followers</span>
      </button>
      <button onClick={() => openPeopleList('following')} className="hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl py-1 transition-all">
        <b className="block text-sm font-bold text-purple-600">{followingCount}</b>
        <span className="text-[10px] text-slate-500 font-medium">Following</span>
      </button>
    </div>
  </div>
)}

      {/* TABS: Text | Photos | Reels */}
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
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                isActive 
                  ? 'border-purple-600 text-purple-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                isActive 
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
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
          
          {/* TEXT TAB */}
          {activeTab === 'text' && (
            textPosts.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-12 font-medium">No text thoughts posted yet.</p>
            ) : (
              textPosts.map(post => (
                <div key={post.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
                  
                  {/* Post Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden flex-shrink-0">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          (profile?.full_name || profile?.username || 'U')[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">
                          {profile?.full_name || profile?.username || 'User'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    
                    {/* Pin Button */}
                    {isOwnProfile && (
                      <button 
                        onClick={() => togglePinned(post)} 
                        className={`p-2 rounded-full transition-all ${
                          post.is_pinned 
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' 
                            : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10'
                        }`}
                        title={post.is_pinned ? 'Unpin post' : 'Pin post'}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Pinned Badge */}
                  {post.is_pinned && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-400/15 px-2 py-1 text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                      <Pin className="w-3 h-3" /> Pinned to profile
                    </div>
                  )}

                  {/* Post Content */}
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>

                  {/* Post Actions */}
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5 text-slate-500 text-xs font-semibold">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 hover:text-purple-600 cursor-pointer transition-colors">
                        <Heart className="w-4 h-4" />
                        <span>{post.likes?.length || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1 hover:text-purple-600 cursor-pointer transition-colors" onClick={() => handleOpenPost(post)}>
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.commentsCount || 0}</span>
                      </div>
                      <button type="button" onClick={() => setSharePost(post)} title="Share post" className="hover:text-purple-600 transition-colors">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    <Bookmark className="w-4 h-4 hover:text-purple-600 cursor-pointer transition-colors" />
                  </div>
                </div>
              ))
            )
          )}

          {/* PHOTOS TAB */}
          {activeTab === 'photos' && (
            photoPosts.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-12 font-medium">No photo posts found.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {photoPosts.map(post => (
                  <div 
                    key={post.id} 
                    onClick={() => handleOpenPost(post)}
                    className="relative group aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-700/70"
                  >
                    <img src={post.media_url} alt="photo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    
                    {/* Pinned Badge */}
                    {post.is_pinned && (
                      <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-extrabold text-amber-950 shadow">
                        <Pin className="w-3 h-3" /> Pinned
                      </span>
                    )}
                    
                    <span className="absolute top-2 right-2 z-10 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white">Photo</span>
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end justify-between p-3 text-white font-bold text-xs">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Heart className="w-4 h-4 fill-white" />{post.likes?.length || 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" />{post.commentsCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isOwnProfile && <button onClick={(e) => { e.stopPropagation(); setReportPost(post); }} className="rounded-full bg-black/50 px-2 py-1 text-[10px]">Report</button>}
                        {isOwnProfile && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); togglePinned(post); }} 
                            className={`rounded-full bg-black/50 p-2 transition-all ${post.is_pinned ? 'text-amber-300' : 'text-white'}`}
                          >
                            <Pin className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* REELS TAB */}
          {activeTab === 'reels' && (
            reelPosts.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-12 font-medium">No video reels uploaded.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {reelPosts.map(post => (
                  <div 
                    key={post.id} 
                    onClick={() => handleOpenPost(post)}
                    className="relative group aspect-[9/16] rounded-2xl overflow-hidden bg-black cursor-pointer shadow-sm ring-1 ring-slate-200/70 dark:ring-slate-700/70"
                  >
                    <video src={post.media_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    
                    {/* Pinned Badge */}
                    {post.is_pinned && (
                      <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-extrabold text-amber-950 shadow">
                        <Pin className="w-3 h-3" /> Pinned
                      </span>
                    )}
                    
                    <span className="absolute top-2 right-2 z-10 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white">Reel</span>
                    
                    {/* Play Icon */}
                    <span className="absolute inset-0 flex items-center justify-center text-white/90 group-hover:scale-110 transition">
                      <span className="rounded-full bg-black/45 p-3"><Play className="w-5 h-5 fill-white" /></span>
                    </span>
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end justify-between p-3 text-white font-bold text-xs">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Heart className="w-4 h-4 fill-white" />{post.likes?.length || 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" />{post.commentsCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isOwnProfile && <button onClick={(e) => { e.stopPropagation(); setReportPost(post); }} className="rounded-full bg-black/50 px-2 py-1 text-[10px]">Report</button>}
                        {isOwnProfile && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); togglePinned(post); }} 
                            className={`rounded-full bg-black/50 p-2 transition-all ${post.is_pinned ? 'text-amber-300' : 'text-white'}`}
                          >
                            <Pin className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* POST MODAL */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className={`bg-white dark:bg-slate-900 rounded-3xl overflow-hidden w-full max-h-[92vh] flex flex-col md:flex-row relative shadow-2xl my-auto ${selectedPost.media_url ? 'max-w-2xl' : 'max-w-4xl min-h-[70vh] md:min-h-[78vh]'}`}>
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedPost(null)}
              className="absolute top-3 right-3 bg-black/60 hover:bg-black text-white p-2 rounded-full z-20 transition-all hover:scale-110"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Media */}
            {selectedPost.media_url && (
              <div className="md:w-1/2 bg-black flex items-center justify-center min-h-[220px] sm:min-h-[280px] max-h-[50vh] md:max-h-[85vh] relative overflow-hidden">
                {selectedPost.media_type === 'video' ? (
                  <video src={selectedPost.media_url} playsInline muted autoPlay className="w-full h-full max-h-[50vh] md:max-h-[85vh] object-contain" />
                ) : (
                  <img src={selectedPost.media_url} alt="post" className="w-full h-full max-h-[50vh] md:max-h-[85vh] object-contain" />
                )}
              </div>
            )}

            {/* Details & Comments */}
            <div className={`${selectedPost.media_url ? 'md:w-1/2 h-[320px] md:h-auto' : 'w-full h-[70vh] md:h-[78vh]'} p-5 sm:p-7 flex flex-col justify-between bg-white dark:bg-slate-900`}>
              <div className="space-y-3 overflow-hidden flex-1 flex flex-col">
                
                {/* User Info */}
                <div className="flex items-center space-x-2.5 border-b border-slate-100 dark:border-slate-800 pb-3 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden flex-shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      (profile?.full_name || profile?.username || 'U')[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">{profile?.full_name || profile?.username}</h4>
                    <p className="text-[10px] text-slate-400">@{profile?.username}</p>
                  </div>
                </div>

                {/* Caption */}
                {selectedPost.content && (
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed flex-shrink-0">
                    {selectedPost.content}
                  </p>
                )}

                {/* Comments List */}
                <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comments</h5>
                  {loadingComments ? (
                    <p className="text-xs text-slate-400 py-4 text-center">Loading comments...</p>
                  ) : postComments.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No comments yet.</p>
                  ) : (
                    postComments.filter(c => !c.parent_comment_id).map(c => (
                      <div key={c.id} className="flex space-x-2 items-start text-xs">
                        <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 font-bold flex items-center justify-center text-[10px] overflow-hidden flex-shrink-0">
                          {c.profiles?.avatar_url ? (
                            <img src={c.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            (c.profiles?.full_name || c.profiles?.username || 'U')[0].toUpperCase()
                          )}
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl flex-1">
                          <span className="font-bold text-[11px] text-slate-800 dark:text-white block">@{c.profiles?.username || 'user'}</span>
                          <span className="text-slate-600 dark:text-slate-300 text-[11px]">{c.content}</span>
                          <div className="mt-1 flex items-center gap-3">
                            <button type="button" onClick={() => toggleCommentLike(c.id)} className={`text-[10px] font-bold ${commentLikes.some(l => l.comment_id === c.id && l.user_id === session.user.id) ? 'text-rose-500' : 'text-slate-400'}`}>
                              ♥ {commentLikes.filter(l => l.comment_id === c.id).length}
                            </button>
                            <button type="button" onClick={() => { setReplyingTo(c); setNewComment(''); }} className="text-[10px] font-bold text-purple-600 hover:underline">
                              Reply
                            </button>
                          </div>
                          {/* Replies */}
                          {postComments.filter(reply => reply.parent_comment_id === c.id).map(reply => (
                            <div key={reply.id} className="mt-2 ml-3 border-l-2 border-purple-200 dark:border-purple-800 pl-2">
                              <span className="font-bold text-[10px] text-slate-700 dark:text-slate-200 block">@{reply.profiles?.username || 'user'}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-300">{reply.content}</span>
                              <div>
                                <button type="button" onClick={() => toggleCommentLike(reply.id)} className={`text-[10px] font-bold ${commentLikes.some(l => l.comment_id === reply.id && l.user_id === session.user.id) ? 'text-rose-500' : 'text-slate-400'}`}>
                                  ♥ {commentLikes.filter(l => l.comment_id === reply.id).length}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Comment Input */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-2 flex-shrink-0">
                {replyingTo && (
                  <div className="mb-2 flex items-center justify-between rounded-lg bg-purple-50 dark:bg-purple-400/10 px-2 py-1.5 text-[10px] text-purple-700 dark:text-purple-300">
                    <span>Replying to @{replyingTo.profiles?.username || 'user'}</span>
                    <button type="button" onClick={() => setReplyingTo(null)}><X className="w-3 h-3" /></button>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <input 
                    type="text" 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <button onClick={handleAddComment} className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition-all">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 w-full max-w-md space-y-4 relative shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Edit Profile</h3>
            
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
              
              {/* Avatar Upload */}
              <div className="flex flex-col items-center space-y-1.5 pb-2">
                <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-purple-500/30 group">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-2xl">
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
                <span className="text-[10px] text-purple-600 font-semibold">
                  {uploadingAvatar ? 'Uploading...' : 'Tap to change avatar'}
                </span>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Username */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Username (Unique)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">@</span>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a unique username"
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl pl-7 pr-3 py-2 text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <button 
                type="submit" 
                disabled={saving || uploadingAvatar}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2.5 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SHARE POST MODAL */}
      {sharePost && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={() => setSharePost(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Share post</h3>
              <button onClick={() => setSharePost(null)} className="rounded-full bg-slate-100 dark:bg-slate-800 p-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={copyPostLink} className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-3 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                {shareCopied ? '✅ Copied!' : '📋 Copy link'}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(postShareUrl(sharePost))}`} target="_blank" rel="noreferrer" className="rounded-2xl bg-emerald-500 px-3 py-3 text-center text-sm font-bold text-white hover:bg-emerald-600 transition-all">
                WhatsApp
              </a>
              <button onClick={nativeSharePost} className="col-span-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-3 text-sm font-bold text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all">
                More sharing options
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT POST MODAL */}
      {reportPost && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setReportPost(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Report post</h3>
              <button onClick={() => setReportPost(null)} className="hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-3">Why are you reporting this post?</p>
            <div className="space-y-2">
              {['Spam', 'Harassment or bullying', 'Hate speech', 'Nudity or violence', 'Misinformation', 'Other'].map((reason) => (
                <label key={reason} className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input type="radio" name="report-reason" checked={reportReason === reason} onChange={() => setReportReason(reason)} className="accent-rose-500" />
                  {reason}
                </label>
              ))}
            </div>
            {reportReason === 'Other' && (
              <textarea 
                value={reportDetails} 
                onChange={(e) => setReportDetails(e.target.value)} 
                placeholder="Tell us more..." 
                rows={3} 
                className="mt-3 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            )}
            <button onClick={submitPostReport} className="mt-4 w-full rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700 transition-all">
              Submit report
            </button>
          </div>
        </div>
      )}

      {/* FOLLOWERS/FOLLOWING LIST MODAL */}
      {listMode && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 w-full max-w-sm max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between mb-3">
              <h3 className="font-bold text-slate-800 dark:text-white">{listMode === 'followers' ? 'Followers' : 'Following'}</h3>
              <button onClick={() => setListMode(null)} className="hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-full">✕</button>
            </div>
            {peopleList.map((person) => (
              <div key={person.id} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                  {person.avatar_url ? (
                    <img src={person.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    (person.full_name || person.username || 'U')[0].toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{person.full_name || person.username}</p>
                  <p className="text-xs text-slate-400">@{person.username}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
