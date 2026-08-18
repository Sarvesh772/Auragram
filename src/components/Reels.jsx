import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, MessageCircle, Send, Bookmark, Music2, Volume2, VolumeX, Trash2, X, Loader2, ChevronLeft } from 'lucide-react';

export default function Reels({ session }) {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Active Comments Drawer State
  const [activeReelId, setActiveReelId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [commentTextMap, setCommentTextMap] = useState({});
  const [loadingComments, setLoadingComments] = useState({});

  // Refs for video elements
  const videoRefs = useRef({});

  useEffect(() => {
    fetchReels();
  }, []);

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

    const { data: reelsData, error } = await supabase
      .from('posts')
      .select('*')
      .eq('media_type', 'video')
      .order('created_at', { ascending: false });

    if (error || !reelsData) {
      setLoading(false);
      return;
    }

    const userIds = [...new Set(reelsData.map(r => r.user_id))];
    const reelIds = reelsData.map(r => r.id);

    const [profilesRes, likesRes, commentsRes] = await Promise.all([
      supabase.from('profiles').select('*').in('id', userIds),
      supabase.from('likes').select('post_id, user_id').in('post_id', reelIds),
      supabase.from('comments').select('id, post_id').in('post_id', reelIds)
    ]);

    const profilesMap = (profilesRes.data || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

    const formattedReels = reelsData.map(reel => ({
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

  // ADD REEL COMMENT + NOTIFICATION
  async function handleAddComment(reel) {
    const reelId = reel.id;
    const text = commentTextMap[reelId];
    if (!text || !text.trim()) return;

    const newCommentObj = {
      post_id: reelId,
      user_id: session.user.id,
      content: text.trim()
    };

    const { data, error } = await supabase
      .from('comments')
      .insert([newCommentObj])
      .select()
      .single();

    if (!error && data) {
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

      setReels(prev => prev.map(r => r.id === reelId ? { ...r, comments: [...r.comments, { id: data.id }] } : r));

      await sendNotification({
        recipientId: reel.user_id,
        actorId: session.user.id,
        type: 'comment',
        postId: reelId
      });
    }
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
    <div className="w-full h-[100dvh] bg-black text-white overflow-hidden">
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
            const isLikedByMe = reel.likes?.some(l => l.user_id === session.user.id);
            const likesCount = reel.likes?.length || 0;
            const commentsCount = reel.comments?.length || 0;

            return (
              <div 
                key={reel.id} 
                className="w-full h-[100dvh] snap-start snap-always relative flex-shrink-0 flex items-center justify-center bg-black"
              >
                {/* Video Player */}
                <video
                  ref={el => videoRefs.current[reel.id] = el}
                  data-reel-id={reel.id}
                  src={reel.media_url}
                  className="w-full h-full object-cover"
                  loop
                  autoPlay
                  muted={isMuted}
                  playsInline
                />

                {/* Gradient Overlay for better text readability */}
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
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 border-2 border-white/80 flex items-center justify-center overflow-hidden font-bold text-sm flex-shrink-0 shadow-lg">
                      {reel.profiles?.avatar_url ? (
                        <img src={reel.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        (reel.profiles?.username || 'U')[0].toUpperCase()
                      )}
                    </div>
                    <span className="font-bold text-sm tracking-wide">@{reel.profiles?.username || 'user'}</span>
                    <button className="text-[10px] bg-white/20 hover:bg-white/30 active:scale-95 backdrop-blur-sm px-3 py-1.5 rounded-full font-semibold border border-white/30 transition-all duration-200 hover:border-white/50">
                      Follow
                    </button>
                  </div>

                  {reel.content && (
                    <p className="text-sm leading-relaxed line-clamp-2 text-white/90 font-medium">
                      {reel.content}
                    </p>
                  )}

                  <div className="flex items-center space-x-2 text-[11px] text-white/70 font-medium">
                    <Music2 className="w-3.5 h-3.5 animate-spin-slow" />
                    <span className="truncate">Original Audio - @{reel.profiles?.username || 'user'}</span>
                  </div>
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
                  <button className="flex flex-col items-center space-y-1 group">
                    <div className="bg-black/40 backdrop-blur-md p-3 rounded-full group-hover:bg-black/60 transition-all duration-200 hover:scale-110 active:scale-90">
                      <Send className="w-6 h-6 text-white" />
                    </div>
                  </button>

                  {/* Bookmark Button */}
                  <button className="flex flex-col items-center space-y-1 group">
                    <div className="bg-black/40 backdrop-blur-md p-3 rounded-full group-hover:bg-black/60 transition-all duration-200 hover:scale-110 active:scale-90">
                      <Bookmark className="w-6 h-6 text-white" />
                    </div>
                  </button>
                </div>

                {/* Bottom Comments Drawer Modal */}
                {activeReelId === reel.id && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900 via-slate-900/95 to-slate-900/80 backdrop-blur-xl text-white rounded-t-3xl p-4 z-30 space-y-3 max-h-[70%] flex flex-col shadow-2xl border-t border-white/10 animate-in slide-in-from-bottom duration-300">
                    {/* Comments Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-shrink-0">
                      <h4 className="text-xs font-black uppercase text-white/60 tracking-wider flex items-center gap-2">
                        <MessageCircle className="w-3.5 h-3.5" />
                        Comments ({commentsCount})
                      </h4>
                      <button 
                        onClick={() => setActiveReelId(null)} 
                        className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all duration-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Comments List */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-0">
                      {loadingComments[reel.id] ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                        </div>
                      ) : (commentsMap[reel.id] || []).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <MessageCircle className="w-8 h-8 text-white/20 mb-2" />
                          <p className="text-xs text-white/40">No comments yet</p>
                          <p className="text-[10px] text-white/30">Be the first to comment!</p>
                        </div>
                      ) : (
                        commentsMap[reel.id].map(comment => (
                          <div key={comment.id} className="flex justify-between items-start group">
                            <div className="flex space-x-3 items-start">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 text-white font-bold flex items-center justify-center text-[10px] overflow-hidden flex-shrink-0 mt-0.5 shadow-lg">
                                {comment.profiles?.avatar_url ? (
                                  <img src={comment.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  (comment.profiles?.username || 'U')[0].toUpperCase()
                                )}
                              </div>
                              <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-2xl text-xs max-w-[220px] border border-white/5">
                                <span className="font-bold text-rose-400 block text-[10px] mb-0.5">
                                  @{comment.profiles?.username || 'user'}
                                </span>
                                <p className="text-white/90 text-[11px] leading-snug">{comment.content}</p>
                              </div>
                            </div>

                            {comment.user_id === session.user.id && (
                              <button
                                onClick={() => handleDeleteComment(reel.id, comment.id)}
                                className="text-white/30 hover:text-rose-500 p-1.5 transition-all duration-200 hover:scale-110"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment Input */}
                    <div className="flex items-center space-x-2 pt-3 border-t border-white/10 flex-shrink-0">
                      <input
                        type="text"
                        value={commentTextMap[reel.id] || ''}
                        onChange={(e) => setCommentTextMap({ ...commentTextMap, [reel.id]: e.target.value })}
                        placeholder="Add a comment..."
                        className="flex-1 bg-white/10 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all duration-200"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(reel)}
                      />
                      <button
                        onClick={() => handleAddComment(reel)}
                        className="bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white p-2.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-90 shadow-lg shadow-rose-500/20"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
      `}</style>
    </div>
  );
}