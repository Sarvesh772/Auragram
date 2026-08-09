import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, MessageCircle, Send, Bookmark, Music2, Volume2, VolumeX, Trash2, X, Loader2 } from 'lucide-react';

export default function Reels({ session }) {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Active Comments Drawer State
  const [activeReelId, setActiveReelId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [commentTextMap, setCommentTextMap] = useState({});
  const [loadingComments, setLoadingComments] = useState({});

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

  return (
    <div className="w-full flex items-center justify-center min-h-screen bg-black text-white selection:bg-purple-500 overflow-hidden">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-xs text-slate-400 font-medium">Loading Reels...</p>
        </div>
      ) : reels.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-sm font-semibold">No Reels available right now!</p>
        </div>
      ) : (
        /* Outer Container - Mobile Full Screen & Desktop Center Framed */
        <div className="w-full h-screen md:h-[92vh] md:max-w-[420px] md:my-auto md:rounded-3xl overflow-hidden shadow-2xl relative bg-black md:border md:border-slate-800 flex flex-col">
          
          {/* Scrollable Container with Vertical Snap */}
          <div className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar scroll-smooth">
            {reels.map((reel) => {
              const isLikedByMe = reel.likes?.some(l => l.user_id === session.user.id);
              const likesCount = reel.likes?.length || 0;
              const commentsCount = reel.comments?.length || 0;

              return (
                <div key={reel.id} className="w-full h-full snap-start snap-always relative flex-shrink-0 flex items-center justify-center bg-black overflow-hidden">
                  
                  {/* Video Player */}
                  <video
                    src={reel.media_url}
                    className="w-full h-full object-cover"
                    loop
                    autoPlay
                    muted={isMuted}
                    playsInline
                  />

                  {/* Top Mute Control */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="absolute top-4 right-4 bg-black/40 text-white p-2.5 rounded-full backdrop-blur-md z-20 hover:bg-black/60 transition active:scale-90"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  {/* Left Bottom User Info Overlay */}
                  <div className="absolute bottom-6 left-4 right-16 text-white space-y-2.5 z-10 drop-shadow-lg">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-full bg-purple-600 border-2 border-white flex items-center justify-center overflow-hidden font-bold text-xs flex-shrink-0">
                        {reel.profiles?.avatar_url ? (
                          <img src={reel.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          (reel.profiles?.username || 'U')[0].toUpperCase()
                        )}
                      </div>
                      <span className="font-bold text-sm tracking-wide drop-shadow-sm">@{reel.profiles?.username || 'user'}</span>
                      <button className="text-[11px] bg-white/20 hover:bg-white/30 active:scale-95 backdrop-blur-md px-3 py-1 rounded-full font-bold border border-white/30 transition">
                        Follow
                      </button>
                    </div>

                    {reel.content && <p className="text-xs line-clamp-2 text-slate-100 font-medium leading-relaxed">{reel.content}</p>}

                    <div className="flex items-center space-x-2 text-[11px] text-slate-300 font-semibold">
                      <Music2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="truncate">Original Audio - @{reel.profiles?.username || 'user'}</span>
                    </div>
                  </div>

                  {/* Right Floating Action Bar */}
                  <div className="absolute bottom-8 right-3 flex flex-col items-center space-y-4 z-10 text-white">
                    
                    {/* Like Button */}
                    <button onClick={() => handleToggleLike(reel)} className="flex flex-col items-center space-y-1 group">
                      <div className="bg-black/40 backdrop-blur-md p-3 rounded-full group-hover:bg-black/60 transition active:scale-125">
                        <Heart className={`w-6 h-6 transition-colors ${isLikedByMe ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                      </div>
                      <span className="text-[11px] font-bold tracking-wider">{likesCount}</span>
                    </button>

                    {/* Comment Button */}
                    <button onClick={() => toggleCommentsView(reel.id)} className="flex flex-col items-center space-y-1 group">
                      <div className="bg-black/40 backdrop-blur-md p-3 rounded-full group-hover:bg-black/60 transition active:scale-110">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[11px] font-bold tracking-wider">{commentsCount}</span>
                    </button>

                    {/* Share Button */}
                    <button className="flex flex-col items-center space-y-1 group">
                      <div className="bg-black/40 backdrop-blur-md p-3 rounded-full group-hover:bg-black/60 transition active:scale-110">
                        <Send className="w-6 h-6 text-white" />
                      </div>
                    </button>

                    {/* Bookmark Button */}
                    <button className="flex flex-col items-center space-y-1 group">
                      <div className="bg-black/40 backdrop-blur-md p-3 rounded-full group-hover:bg-black/60 transition active:scale-110">
                        <Bookmark className="w-6 h-6 text-white" />
                      </div>
                    </button>
                  </div>

                  {/* Bottom Comments Drawer Modal */}
                  {activeReelId === reel.id && (
                    <div className="absolute inset-x-0 bottom-0 bg-slate-900/95 backdrop-blur-xl text-white rounded-t-3xl p-4 z-30 space-y-3 max-h-[65%] flex flex-col justify-between shadow-2xl border-t border-slate-800 animate-in slide-in-from-bottom duration-200">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Comments ({commentsCount})</h4>
                        <button onClick={() => setActiveReelId(null)} className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Comments List */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
                        {loadingComments[reel.id] ? (
                          <p className="text-xs text-slate-400 text-center py-6">Loading comments...</p>
                        ) : (commentsMap[reel.id] || []).length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-6">No comments yet. Be the first!</p>
                        ) : (
                          commentsMap[reel.id].map(comment => (
                            <div key={comment.id} className="flex justify-between items-start group">
                              <div className="flex space-x-2.5 items-start">
                                <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[10px] overflow-hidden flex-shrink-0 mt-0.5">
                                  {comment.profiles?.avatar_url ? (
                                    <img src={comment.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                  ) : (
                                    (comment.profiles?.username || 'U')[0].toUpperCase()
                                  )}
                                </div>
                                <div className="bg-slate-800/80 p-2.5 rounded-2xl text-xs max-w-[210px] border border-slate-700/50">
                                  <span className="font-bold text-purple-400 block text-[11px] mb-0.5">@{comment.profiles?.username || 'user'}</span>
                                  <p className="text-slate-200 text-[11px] leading-snug">{comment.content}</p>
                                </div>
                              </div>

                              {comment.user_id === session.user.id && (
                                <button
                                  onClick={() => handleDeleteComment(reel.id, comment.id)}
                                  className="text-slate-500 hover:text-rose-500 p-1.5 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Comment Input */}
                      <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                        <input
                          type="text"
                          value={commentTextMap[reel.id] || ''}
                          onChange={(e) => setCommentTextMap({ ...commentTextMap, [reel.id]: e.target.value })}
                          placeholder="Add a comment..."
                          className="flex-1 bg-slate-800/80 border border-slate-700/60 rounded-full px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment(reel)}
                        />
                        <button
                          onClick={() => handleAddComment(reel)}
                          className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full transition active:scale-90"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}