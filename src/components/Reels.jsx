import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, MessageCircle, Send, Bookmark, Music2, Volume2, VolumeX, Trash2, X, Loader2, MoreVertical } from 'lucide-react';
import MentionInput from './MentionInput';
import { RenderFormattedText } from './MentionInput';

// Helper to extract @mentions and trigger notifications
async function processMentions(text, actorId, postId) {
  if (!text) return;
  const matches = text.match(/@([a-zA-Z0-9_]+)/g);
  if (!matches) return;

  const usernames = [...new Set(matches.map(m => m.replace('@', '').toLowerCase()))];

  const { data: taggedUsers } = await supabase
    .from('profiles')
    .select('id, username')
    .in('username', usernames);

  if (taggedUsers && taggedUsers.length > 0) {
    const notifs = taggedUsers
      .filter(u => u.id !== actorId)
      .map(u => ({
        recipient_id: u.id,
        actor_id: actorId,
        type: 'mention',
        post_id: postId,
        is_read: false
      }));

    if (notifs.length > 0) {
      await supabase.from('notifications').insert(notifs);
    }
  }
}

export default function Reels({ session, onViewProfile, initialReelId }) {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [bookmarkedReelIds, setBookmarkedReelIds] = useState(new Set());
  const [menuReelId, setMenuReelId] = useState(null);
  const [editingReel, setEditingReel] = useState(null);
  const [editText, setEditText] = useState('');
  const [reportReel, setReportReel] = useState(null);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [videoProgress, setVideoProgress] = useState({});

  // Active Comments Drawer State
  const [activeReelId, setActiveReelId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [commentTextMap, setCommentTextMap] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [commentLikes, setCommentLikes] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);

  // Refs for video elements
  const videoRefs = useRef({});

  useEffect(() => {
    fetchReels();
    fetchBookmarks();
  }, []);

  useEffect(() => {
    if (initialReelId && reels.length) {
      const index = reels.findIndex((reel) => reel.id === initialReelId);
      if (index >= 0) setTimeout(() => document.querySelector(`[data-reel-card="${initialReelId}"]`)?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [initialReelId, reels]);

  async function fetchBookmarks() {
    const { data } = await supabase.from('bookmarks').select('post_id').eq('user_id', session.user.id);
    setBookmarkedReelIds(new Set((data || []).map((item) => item.post_id)));
  }

  async function handleToggleBookmark(reelId) {
    const saved = bookmarkedReelIds.has(reelId);
    setBookmarkedReelIds((prev) => {
      const next = new Set(prev);
      saved ? next.delete(reelId) : next.add(reelId);
      return next;
    });
    if (saved) await supabase.from('bookmarks').delete().eq('user_id', session.user.id).eq('post_id', reelId);
    else await supabase.from('bookmarks').insert([{ user_id: session.user.id, post_id: reelId }]);
  }

  async function handleDeleteReel(reelId) {
    const { error } = await supabase.from('posts').delete().eq('id', reelId).eq('user_id', session.user.id);
    if (!error) setReels((prev) => prev.filter((reel) => reel.id !== reelId));
    setMenuReelId(null);
  }

  async function handleEditReel() {
    if (!editingReel) return;
    const { error } = await supabase.from('posts').update({ content: editText.trim() }).eq('id', editingReel.id).eq('user_id', session.user.id);
    if (!error) {
      await processMentions(editText.trim(), session.user.id, editingReel.id);
      setReels((prev) => prev.map((reel) => reel.id === editingReel.id ? { ...reel, content: editText.trim() } : reel));
    }
    setEditingReel(null);
  }

  async function copyReelLink(reel) { await navigator.clipboard?.writeText(`${window.location.origin}/reels?reel=${encodeURIComponent(reel.id)}`); setMenuReelId(null); }
  async function submitReelReport() {
    if (!reportReel) return;
    const reason = reportReason === 'Other' ? reportDetails.trim() : reportReason;
    if (!reason) return;
    const { error } = await supabase.from('reports').insert([{ reporter_id: session.user.id, reported_user_id: reportReel.user_id, post_id: reportReel.id, reason }]);
    if (error) { setReportMessage(`Report failed: ${error.message}`); return; }
    setReportReel(null); setReportDetails(''); setReportReason('Spam');
    setReportMessage('Reel report submitted successfully.');
    setTimeout(() => setReportMessage(''), 2400);
  }

  // HELPER FUNCTION FOR NOTIFICATIONS
  async function sendNotification({ recipientId, actorId, type, postId = null }) {
    if (!recipientId || recipientId === actorId) return;

    const { error } = await supabase.from('notifications').insert([
      {
        recipient_id: recipientId,
        actor_id: actorId,
        type: type,
        post_id: postId,
        is_read: false
      }
    ]);

    if (error) {
      console.error('Error inserting notification for reel:', error);
    }
  }

  async function fetchReels() {
    setLoading(true);

    const [{ data: blockedRows }, { data: blockedByRows }] = await Promise.all([
      supabase.from('blocked_users').select('blocked_id').eq('blocker_id', session.user.id),
      supabase.from('blocked_users').select('blocker_id').eq('blocked_id', session.user.id)
    ]);
    const hiddenUsers = new Set([
      ...(blockedRows || []).map(r => r.blocked_id),
      ...(blockedByRows || []).map(r => r.blocker_id)
    ]);

    const { data: reelsData, error } = await supabase
      .from('posts')
      .select('*')
      .eq('media_type', 'video')
      .order('created_at', { ascending: false });

    if (error || !reelsData) {
      setLoading(false);
      return;
    }

    const visibleReels = reelsData.filter(r => !hiddenUsers.has(r.user_id));
    const userIds = [...new Set(visibleReels.map(r => r.user_id))];
    const reelIds = visibleReels.map(r => r.id);

    const [profilesRes, likesRes, commentsRes] = await Promise.all([
      supabase.from('profiles').select('*').in('id', userIds),
      supabase.from('likes').select('post_id, user_id').in('post_id', reelIds),
      supabase.from('comments').select('id, post_id').in('post_id', reelIds)
    ]);

    const profilesMap = (profilesRes.data || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

    const formattedReels = visibleReels.map(reel => ({
      ...reel,
      profiles: profilesMap[reel.user_id] || null,
      likes: (likesRes.data || []).filter(l => l.post_id === reel.id),
      comments: (commentsRes.data || []).filter(c => c.post_id === reel.id)
    }));

    setReels(formattedReels);
    setLoading(false);
  }

  // REEL LIKE TOGGLE + NOTIFICATION
  async function handleToggleLike(reel) {
    const isLiked = reel.likes?.some(like => like.user_id === session.user.id);

    setReels(prev => prev.map(r => {
      if (r.id === reel.id) {
        const updatedLikes = isLiked
          ? r.likes.filter(l => l.user_id !== session.user.id)
          : [...r.likes, { user_id: session.user.id }];
        return { ...r, likes: updatedLikes };
      }
      return r;
    }));

    if (isLiked) {
      await supabase.from('likes').delete().eq('post_id', reel.id).eq('user_id', session.user.id);
    } else {
      await supabase.from('likes').insert([{ post_id: reel.id, user_id: session.user.id }]);

      await sendNotification({
        recipientId: reel.user_id,
        actorId: session.user.id,
        type: 'like',
        postId: reel.id
      });
    }
  }

  // TOGGLE REEL COMMENTS VIEW
  async function toggleCommentsView(reelId) {
    if (activeReelId === reelId) {
      setActiveReelId(null);
      return;
    }

    setActiveReelId(reelId);
    setLoadingComments(prev => ({ ...prev, [reelId]: true }));

    const { data: commentsData } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', reelId)
      .order('created_at', { ascending: true });

    if (commentsData && commentsData.length > 0) {
      const commentUserIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', commentUserIds);

      const profilesMap = (profilesData || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

      const fullComments = commentsData.map(c => ({
        ...c,
        profiles: profilesMap[c.user_id] || null
      }));

      setCommentsMap(prev => ({ ...prev, [reelId]: fullComments }));
    } else {
      setCommentsMap(prev => ({ ...prev, [reelId]: [] }));
    }

    setLoadingComments(prev => ({ ...prev, [reelId]: false }));
  }

  // ADD REEL COMMENT + NOTIFICATION & MENTION
  async function handleAddComment(reel) {
    const reelId = reel.id;
    const text = commentTextMap[reelId];
    if (!text || !text.trim()) return;

    const newCommentObj = {
      post_id: reelId,
      user_id: session.user.id,
      content: text.trim(),
      parent_comment_id: replyingTo?.id || null
    };

    const { data, error } = await supabase
      .from('comments')
      .insert([newCommentObj])
      .select()
      .single();

    if (!error && data) {
      await processMentions(text, session.user.id, reelId);

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      const createdComment = { ...data, profiles: myProfile };

      setCommentsMap(prev => ({
        ...prev,
        [reelId]: [...(prev[reelId] || []), createdComment]
      }));
      setCommentTextMap(prev => ({ ...prev, [reelId]: '' }));
      setReplyingTo(null);

      setReels(prev => prev.map(r => r.id === reelId ? { ...r, comments: [...r.comments, { id: data.id }] } : r));

      await sendNotification({
        recipientId: reel.user_id,
        actorId: session.user.id,
        type: 'comment',
        postId: reelId
      });
    }
  }

  async function toggleCommentLike(commentId, reelId) {
    const liked = (commentLikes[reelId] || []).includes(commentId);
    if (liked) await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', session.user.id);
    else await supabase.from('comment_likes').insert([{ comment_id: commentId, post_id: reelId, user_id: session.user.id }]);
    setCommentLikes(prev => ({ ...prev, [reelId]: liked ? (prev[reelId] || []).filter(id => id !== commentId) : [...(prev[reelId] || []), commentId] }));
  }

  async function handleDeleteComment(reelId, commentId) {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      setCommentsMap(prev => ({
        ...prev,
        [reelId]: prev[reelId].filter(c => c.id !== commentId)
      }));

      setReels(prev => prev.map(r => r.id === reelId ? { ...r, comments: r.comments.filter(c => c.id !== commentId) } : r));
    }
  }

  async function handleShareReel(reel) {
    const reelUrl = `${window.location.origin}/reels?reel=${encodeURIComponent(reel.id)}`;
    const shareData = { title: 'Auragram Reel', text: reel.content || 'Check out this reel on Auragram', url: reelUrl };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(reelUrl);
    } catch (error) {
      if (error?.name !== 'AbortError') console.error('Share failed:', error);
    }
  }

  // Handle video visibility for autoplay
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = videoRefs.current[entry.target.dataset.reelId];
          if (video) {
            if (entry.isIntersecting) {
              video.play().catch(() => {});
            } else {
              video.pause();
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    Object.values(videoRefs.current).forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => observer.disconnect();
  }, [reels]);

  return (
    <div className="w-full h-[calc(100dvh-124px)] md:h-[100dvh] bg-black text-white overflow-hidden">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
          <p className="text-sm text-slate-400 font-medium">Loading Reels...</p>
        </div>
      ) : reels.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4">
            <Music2 className="w-10 h-10 text-slate-600" />
          </div>
          <p className="text-lg font-bold text-white">No Reels Yet</p>
          <p className="text-sm text-slate-400 mt-1">Check back later for new reels!</p>
        </div>
      ) : (
        <div className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar scroll-smooth">
          {reels.map((reel) => {
            const isOwnReel = reel.user_id === session.user.id ||
              (reel.profiles?.username && reel.profiles.username === session.user.user_metadata?.username);
            const isLikedByMe = reel.likes?.some(l => l.user_id === session.user.id);
            const likesCount = reel.likes?.length || 0;
            const commentsCount = reel.comments?.length || 0;

            return (
              <div 
                key={reel.id} 
                data-reel-card={reel.id}
                className="w-full h-[calc(100dvh-124px)] md:h-[100dvh] snap-start snap-always relative flex-shrink-0 flex items-center justify-center bg-black"
              >
                {/* Video Player */}
                <video
                  ref={el => videoRefs.current[reel.id] = el}
                  data-reel-id={reel.id}
                  src={reel.media_url}
                  className="w-full h-full object-cover"
                  loop
                  preload="none"
                  muted={isMuted}
                  playsInline
                  onClick={(e) => { e.stopPropagation(); const video = e.currentTarget; video.paused ? video.play() : video.pause(); }}
                  onTimeUpdate={(e) => { const video = e.currentTarget; setVideoProgress((prev) => ({ ...prev, [reel.id]: { current: video.currentTime, duration: video.duration || 0 } })); }}
                />

                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/25 z-20 cursor-pointer" onClick={(e) => { e.stopPropagation(); const video = videoRefs.current[reel.id]; if (video?.duration) video.currentTime = ((e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.clientWidth) * video.duration; }}><div className="h-full bg-white transition-[width]" style={{ width: `${Math.min(100, ((videoProgress[reel.id]?.current || 0) / (videoProgress[reel.id]?.duration || 1)) * 100)}%` }} /></div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                {/* Top Mute Control */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm z-20 transition-all duration-200 hover:scale-110 active:scale-90"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                {/* Reel Indicator */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 z-20">
                  {reels.map((_, idx) => (
                    <div 
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                        idx === reels.indexOf(reel) ? 'w-6 bg-white' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>

                {/* Left Bottom User Info Overlay */}
                <div className="absolute bottom-6 left-4 right-16 text-white space-y-3 z-10">
                  <div className="flex items-center space-x-3">
                    <button onClick={() => onViewProfile?.(reel.user_id)} className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 border-2 border-white/80 flex items-center justify-center overflow-hidden font-bold text-sm flex-shrink-0 shadow-lg">
                      {reel.profiles?.avatar_url ? (
                        <img src={reel.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        (reel.profiles?.username || 'U')[0].toUpperCase()
                      )}
                    </button>
                    <button onClick={() => onViewProfile?.(reel.user_id)} className="font-bold text-sm tracking-wide text-left">{reel.profiles?.full_name || reel.profiles?.username || 'User'}</button>
                  </div>

                  {reel.content && (
                    <p className="text-sm leading-relaxed line-clamp-2 text-white/90 font-medium">
                      <RenderFormattedText text={reel.content} onViewProfile={onViewProfile} />
                    </p>
                  )}
{reel.audio_title && (
  <div className="pt-1">
    {reel.audio_title && <div className="text-xs text-white/80">♪ {reel.audio_title}{reel.audio_artist ? ` · ${reel.audio_artist}` : ''}</div>}
  </div>
)}
                </div>

                {/* Right Floating Action Bar */}
                <div className="absolute bottom-8 right-3 flex flex-col items-center space-y-4 z-10">
                  {/* Like Button */}
                  <button 
                    onClick={() => handleToggleLike(reel)} 
                    className="flex flex-col items-center space-y-1 group"
                  >
                    <div className="bg-black/40 backdrop-blur-md p-3 rounded-full group-hover:bg-black/60 transition-all duration-200 hover:scale-110 active:scale-90">
                      <Heart 
                        className={`w-6 h-6 transition-all duration-300 ${
                          isLikedByMe ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white'
                        }`} 
                      />
                    </div>
                    <span className="text-[10px] font-bold tracking-wider text-white/90">{likesCount}</span>
                  </button>

                  {/* Comment Button */}
                  <button 
                    onClick={() => toggleCommentsView(reel.id)} 
                    className="flex flex-col items-center space-y-1 group"
                  >
                    <div className="bg-black/40 backdrop-blur-md p-3 rounded-full group-hover:bg-black/60 transition-all duration-200 hover:scale-110 active:scale-90">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[10px] font-bold tracking-wider text-white/90">{commentsCount}</span>
                  </button>

                  {/* Share Button */}
                  <button onClick={() => handleShareReel(reel)} className="flex flex-col items-center space-y-1 group" title="Share reel">
                    <div className="bg-black/40 backdrop-blur-md p-3 rounded-full group-hover:bg-black/60 transition-all duration-200 hover:scale-110 active:scale-90">
                      <Send className="w-6 h-6 text-white" />
                    </div>
                  </button>

                  {/* Bookmark Button */}
                  <button onClick={() => handleToggleBookmark(reel.id)} className="flex flex-col items-center space-y-1 group" title="Bookmark reel">
                    <div className="bg-black/40 backdrop-blur-md p-3 rounded-full group-hover:bg-black/60 transition-all duration-200 hover:scale-110 active:scale-90">
                      <Bookmark className={`w-6 h-6 ${bookmarkedReelIds.has(reel.id) ? 'fill-amber-400 text-amber-400' : 'text-white'}`} />
                    </div>
                  </button>

                  {/* More actions */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuReelId(menuReelId === reel.id ? null : reel.id)}
                      className="bg-black/40 backdrop-blur-md p-3 rounded-full text-white hover:bg-black/60 transition-all duration-200 hover:scale-110 active:scale-90"
                      title="More options"
                      aria-label="More options"
                    >
                      <MoreVertical className="w-6 h-6" />
                    </button>
                    {menuReelId === reel.id && (
                      <div className="absolute right-0 bottom-14 min-w-28 flex flex-col gap-1 bg-slate-950/95 p-1.5 rounded-xl shadow-2xl border border-white/20">
                        {isOwnReel ? <><button onClick={() => { setEditingReel(reel); setEditText(reel.content || ''); setMenuReelId(null); }} className="text-left text-white hover:bg-white/15 px-3 py-2 rounded-lg text-xs font-semibold">Edit caption</button><button onClick={() => handleDeleteReel(reel.id)} className="text-left text-rose-300 hover:bg-rose-500/20 px-3 py-2 rounded-lg text-xs font-semibold">Delete reel</button></> : <><button onClick={() => setReportReel(reel)} className="text-left text-rose-300 hover:bg-rose-500/20 px-3 py-2 rounded-lg text-xs font-semibold">Report reel</button><button onClick={() => copyReelLink(reel)} className="text-left text-white hover:bg-white/15 px-3 py-2 rounded-lg text-xs font-semibold">Copy link</button></>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Comments Drawer Modal - FINAL PREMIUM VERSION (Icon Only) */}
{activeReelId === reel.id && (
  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0f0f0f] via-[#1a1a1a] to-[#1a1a1a]/95 backdrop-blur-xl text-white rounded-t-3xl p-0 z-30 max-h-[60%] md:max-h-[65%] flex flex-col shadow-2xl border-t border-white/10 animate-in slide-in-from-bottom duration-300">
    
    {/* Header */}
    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0 bg-gradient-to-r from-[#1a1a1a] to-transparent">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-gradient-to-b from-rose-500 to-amber-500 rounded-full"></div>
        <h4 className="text-sm font-semibold tracking-wide text-white/90">
          Comments
        </h4>
        <span className="text-xs font-medium text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
          {commentsCount}
        </span>
      </div>
      <button 
        onClick={() => {
          setActiveReelId(null);
          setReplyingTo(null);
        }} 
        className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300 hover:scale-110"
      >
        <X className="w-4 h-4" />
      </button>
    </div>

    {/* Comments List */}
    <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5 custom-scrollbar">
      {loadingComments[reel.id] ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div>
        </div>
      ) : (commentsMap[reel.id] || []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500/10 to-amber-500/10 flex items-center justify-center mb-4 border border-white/5">
            <MessageCircle className="w-7 h-7 text-white/20" />
          </div>
          <p className="text-sm font-medium text-white/40">No comments yet</p>
          <p className="text-xs text-white/20 mt-1">Be the first to share your thoughts</p>
        </div>
      ) : (
        commentsMap[reel.id].map((comment) => {
          const isLiked = (commentLikes[reel.id] || []).includes(comment.id);
          const likeCount = (commentLikes[reel.id] || []).filter(id => id === comment.id).length;
          
          return (
            <div key={comment.id} className="group space-y-2">
              {/* Main Comment */}
              <div className="flex gap-3">
                {/* Avatar with Glow */}
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-500/20 to-amber-500/20 blur-sm group-hover:blur-md transition-all duration-500"></div>
                  <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center text-xs font-bold overflow-hidden ring-2 ring-white/10 group-hover:ring-white/20 transition-all duration-300">
                    {comment.profiles?.avatar_url ? (
                      <img src={comment.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      (comment.profiles?.full_name || comment.profiles?.username || 'U')[0].toUpperCase()
                    )}
                  </div>
                </div>
                
                {/* Comment Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-white/95">
                      {comment.profiles?.full_name || comment.profiles?.username || 'User'}
                    </span>
                    <span className="text-xs text-white/40">
                      @{comment.profiles?.username || 'user'}
                    </span>
                    <span className="text-[10px] text-white/30 tracking-wide">
                      · {new Date(comment.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  <p className="text-sm text-white/90 leading-relaxed mt-0.5 pl-0.5">
                    <RenderFormattedText text={comment.content} onViewProfile={onViewProfile} />
                  </p>
                  
                  {/* Comment Actions */}
                  <div className="flex items-center gap-4 mt-2">
                    <button 
                      onClick={() => toggleCommentLike(comment.id, reel.id)} 
                      className={`flex items-center gap-1.5 text-xs font-medium transition-all duration-300 ${
                        isLiked 
                          ? 'text-rose-500' 
                          : 'text-white/30 hover:text-white/70 hover:scale-105'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 transition-all duration-300 ${isLiked ? 'fill-rose-500 scale-110' : ''}`} />
                      {likeCount > 0 && <span>{likeCount}</span>}
                    </button>
                    
                    <button 
                      onClick={() => { 
                        setReplyingTo(comment); 
                        setCommentTextMap(prev => ({ ...prev, [reel.id]: '' }));
                      }} 
                      className="text-xs font-medium text-white/30 hover:text-white/70 hover:scale-105 transition-all duration-300"
                    >
                      Reply
                    </button>
                    
                    {comment.user_id === session.user.id && (
                      <button
                        onClick={() => handleDeleteComment(reel.id, comment.id)}
                        className="text-xs font-medium text-white/20 hover:text-rose-400 hover:scale-105 transition-all duration-300 ml-auto"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-12 space-y-3 border-l-2 border-gradient-to-b from-rose-500/30 to-amber-500/30 pl-4">
                  {comment.replies.map((reply) => {
                    const isReplyLiked = (commentLikes[reel.id] || []).includes(reply.id);
                    const replyLikeCount = (commentLikes[reel.id] || []).filter(id => id === reply.id).length;
                    
                    return (
                      <div key={reply.id} className="group/reply">
                        <div className="flex gap-3">
                          {/* Reply Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-[10px] font-bold overflow-hidden ring-2 ring-white/5 group-hover/reply:ring-white/20 transition-all duration-300">
                              {reply.profiles?.avatar_url ? (
                                <img src={reply.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                (reply.profiles?.username || 'U')[0].toUpperCase()
                              )}
                            </div>
                          </div>
                          
                          {/* Reply Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-xs text-white/95">
                                {reply.profiles?.full_name || reply.profiles?.username || 'User'}
                              </span>
                              <span className="text-[10px] text-white/40">
                                @{reply.profiles?.username}
                              </span>
                              <span className="text-[9px] text-white/30">
                                · {new Date(reply.created_at).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </span>
                            </div>
                            
                            <p className="text-xs text-white/85 leading-relaxed mt-0.5">
                              <RenderFormattedText text={reply.content} onViewProfile={onViewProfile} />
                            </p>
                            
                            {/* Reply Actions */}
                            <div className="flex items-center gap-4 mt-1.5">
                              <button 
                                onClick={() => toggleCommentLike(reply.id, reel.id)} 
                                className={`flex items-center gap-1 text-[10px] font-medium transition-all duration-300 ${
                                  isReplyLiked 
                                    ? 'text-rose-500' 
                                    : 'text-white/30 hover:text-white/70 hover:scale-105'
                                }`}
                              >
                                <Heart className={`w-3 h-3 transition-all duration-300 ${isReplyLiked ? 'fill-rose-500 scale-110' : ''}`} />
                                {replyLikeCount > 0 && <span>{replyLikeCount}</span>}
                              </button>
                              
                              <button 
                                onClick={() => { 
                                  setReplyingTo(reply); 
                                  setCommentTextMap(prev => ({ ...prev, [reel.id]: '' }));
                                }} 
                                className="text-[10px] font-medium text-white/30 hover:text-white/70 hover:scale-105 transition-all duration-300"
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>

    {/* Comment Input - Icon Only */}
    <div className="border-t border-white/10 p-4 flex-shrink-0 bg-gradient-to-b from-transparent to-[#0f0f0f]">
      {replyingTo && replyingTo.post_id === reel.id && (
        <div className="flex items-center justify-between text-xs text-rose-400/80 mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-gradient-to-b from-rose-500 to-amber-500 rounded-full"></div>
            <span>Replying to @{replyingTo.profiles?.username || 'user'}</span>
          </div>
          <button 
            onClick={() => setReplyingTo(null)} 
            className="text-white/30 hover:text-white/60 transition-all duration-300 hover:rotate-90"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      
      <div className="flex items-center gap-3 bg-white/5 rounded-full px-4 py-1 border border-white/10 focus-within:border-rose-500/40 focus-within:ring-1 focus-within:ring-rose-500/40 transition-all duration-300">
        <div className="flex-1">
          <MentionInput
            value={commentTextMap[reel.id] || ''}
            onChange={(val) => setCommentTextMap({ ...commentTextMap, [reel.id]: val })}
            placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
            onSend={() => handleAddComment(reel)}
            currentUserId={session.user.id}
            className="w-full bg-transparent border-0 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-0"
          />
        </div>
        <button
          onClick={() => handleAddComment(reel)}
          disabled={!commentTextMap[reel.id]?.trim()}
          className={`p-2 rounded-full transition-all duration-300 ${
            !commentTextMap[reel.id]?.trim() 
              ? 'text-white/20 cursor-not-allowed' 
              : 'bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:shadow-lg hover:shadow-rose-500/25 hover:scale-110 active:scale-95'
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
)}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Reel Modal */}
      {editingReel && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl p-4 w-full max-w-sm space-y-3">
            <h3 className="font-bold text-white">Edit Reel</h3>
            <MentionInput
              value={editText}
              onChange={setEditText}
              placeholder="Edit caption..."
              currentUserId={session.user.id}
              className="w-full rounded-xl bg-white/10 p-3 text-sm text-white outline-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingReel(null)} className="px-3 py-2 text-sm text-slate-300">Cancel</button>
              <button onClick={handleEditReel} className="bg-rose-600 px-4 py-2 rounded-xl text-sm font-bold text-white">Save</button>
            </div>
          </div>
        </div>
      )}
      {reportMessage && <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[80] rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xl">{reportMessage}</div>}
      {reportReel && <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setReportReel(null)}><div className="bg-slate-900 rounded-2xl p-5 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><h3 className="font-bold text-white">Report reel</h3><button onClick={() => setReportReel(null)} className="text-slate-400">×</button></div><p className="text-xs text-slate-300">Why are you reporting this reel?</p><div className="space-y-2">{['Spam','Harassment or bullying','Hate speech','Misinformation','Other'].map((reason) => <label key={reason} className="flex items-center gap-2 text-xs text-slate-200"><input type="radio" name="reel-report-reason" checked={reportReason === reason} onChange={() => setReportReason(reason)} />{reason}</label>)}</div>{reportReason === 'Other' && <textarea value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} placeholder="Tell us more..." rows={3} className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-white outline-none" />}<div className="flex justify-end gap-2"><button onClick={() => setReportReel(null)} className="px-3 py-2 text-sm text-slate-300">Cancel</button><button onClick={submitReelReport} className="bg-rose-600 px-4 py-2 rounded-xl text-sm font-bold text-white">Submit report</button></div></div></div>}
    </div>
  );
}
