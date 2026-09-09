import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  FileText, Image as ImageIcon, Film, Heart, MessageCircle, 
  Send, Bookmark, Edit3, X, Sparkles, Loader2, Camera, AlertCircle, 
  CheckCircle2, Pin, Play, Flag, MoreVertical, Copy, UserPlus, 
  UserCheck, UserMinus, Users, Eye, Trash2, Clipboard, Check, Share2, BadgeCheck
} from 'lucide-react';
import PostCaption from './PostCaption';

// ============================================================
// POST DETAIL COMPONENT - Outside Profile Component
// ============================================================
export function PostDetail({ post, profile, session, onBack, onShare, onReport, onViewProfile }) {
  const isOwnPost = post.user_id === session?.user?.id;
  const [comments, setComments] = useState([]);
  const [commentLikes, setCommentLikes] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const commentInputRef = useRef(null);

  useEffect(() => {
    fetchComments();
  }, [post.id]);

  useEffect(() => {
    if (commentInputRef.current) {
      setTimeout(() => commentInputRef.current.focus(), 100);
    }
  }, [replyingTo]);

  async function fetchComments() {
    setLoadingComments(true);
    
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    
    const { data: likesData } = await supabase
      .from('comment_likes')
      .select('comment_id, user_id')
      .eq('post_id', post.id);
    
    setCommentLikes(likesData || []);
    
    if (commentsData && commentsData.length > 0) {
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: cProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      const cProfilesMap = (cProfiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      
      setComments(commentsData.map(c => ({ ...c, profiles: cProfilesMap[c.user_id] || null })));
    } else {
      setComments([]);
    }
    
    setLoadingComments(false);
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;
    
    const replyPrefix = replyingTo?.profiles?.username ? `@${replyingTo.profiles.username} ` : '';
    const commentContent = `${replyPrefix}${newComment.trim()}`;
    
    const { data, error } = await supabase
      .from('comments')
      .insert([{ 
        post_id: post.id, 
        user_id: session.user.id, 
        content: commentContent, 
        parent_comment_id: replyingTo?.id || null 
      }])
      .select()
      .single();
    
    if (!error && data) {
      if (post.user_id !== session.user.id) await supabase.from('notifications').insert([{ recipient_id: post.user_id, actor_id: session.user.id, type: 'comment', post_id: post.id, is_read: false }]);
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      setComments([...comments, { ...data, profiles: myProfile }]);
      setNewComment('');
      setReplyingTo(null);
    }
  }

  async function toggleCommentLike(commentId) {
    const existing = commentLikes.find((like) => like.comment_id === commentId && like.user_id === session.user.id);
    
    if (existing) {
      setCommentLikes((prev) => prev.filter((like) => !(like.comment_id === commentId && like.user_id === session.user.id)));
      await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', session.user.id);
    } else {
      const optimisticLike = { comment_id: commentId, post_id: post.id, user_id: session.user.id, id: `local-${commentId}` };
      setCommentLikes((prev) => [...prev, optimisticLike]);
      await supabase.from('comment_likes').insert([{ 
        comment_id: commentId, 
        post_id: post.id, 
        user_id: session.user.id 
      }]);
    }
  }

  async function handleDeleteComment(commentId) {
    const { error } = await supabase.from('comments').delete().eq('id', commentId).eq('user_id', session.user.id);
    if (!error) {
      setComments((prev) => prev.filter((comment) => comment.id !== commentId && comment.parent_comment_id !== commentId));
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
        <button 
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-sm font-bold text-slate-800 dark:text-white">Post</h2>
      </div>

      {/* Post Content */}
      <div className="max-w-2xl mx-auto px-4 py-4 pb-28">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
          {/* Post Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm overflow-hidden flex-shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  (profile?.full_name || profile?.username || 'U')[0].toUpperCase()
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                  {profile?.full_name || profile?.username || 'User'}
                </h4>
                <p className="text-xs text-slate-400">
                  @{profile?.username} · {new Date(post.created_at).toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Media */}
          {post.media_url && (
            <div className="mb-3 -mx-4 sm:-mx-5">
              {post.media_type === 'video' ? (
                <video 
                  src={post.media_url} 
                  className="w-full max-h-[500px] object-contain bg-black"
                  controls
                  playsInline
                />
              ) : (
                <img 
                  src={post.media_url} 
                  alt="post" 
                  className="w-full max-h-[500px] object-contain bg-black"
                />
              )}
            </div>
          )}

          {/* Post Content */}
          {post.content && <PostCaption text={post.content} disableTruncation />}

          {/* Post Stats */}
          <div className="flex items-center gap-5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <button type="button" className="flex items-center gap-1 hover:text-rose-500 transition-colors">
              <Heart className="w-4 h-4" /> {post.likes?.length || 0}
            </button>
            <button type="button" className="flex items-center gap-1 hover:text-purple-600 transition-colors" onClick={() => commentInputRef.current?.focus()}>
              <MessageCircle className="w-4 h-4" /> {comments.length}
            </button>
            <button type="button" onClick={() => onShare?.(post)} className="flex items-center gap-1 hover:text-purple-600 transition-colors" aria-label="Share post">
              <Send className="w-4 h-4" />
            </button>
            {!isOwnPost && (
              <button type="button" onClick={() => onReport?.(post)} className="flex items-center gap-1 hover:text-rose-600 transition-colors" aria-label="Report post">
                <Flag className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Comments ({comments.length})
          </h3>

          {loadingComments ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-2xl">
              <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No comments yet</p>
              <p className="text-xs text-slate-400/70">Be the first to comment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.filter(c => !c.parent_comment_id).map(comment => (
                <div key={comment.id} className="flex gap-3">
                  {(() => {
                    const authorLiked = commentLikes.some((like) => like.comment_id === comment.id && like.user_id === post.user_id);
                    return (
                      <>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                    {comment.profiles?.avatar_url ? (
                      <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (comment.profiles?.full_name || comment.profiles?.username || 'U')[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl px-3 py-2.5 relative">
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" onClick={() => onViewProfile?.(comment.user_id)} className="text-sm font-bold text-slate-900 dark:text-white hover:text-purple-600">
                          {comment.profiles?.full_name || comment.profiles?.display_name || comment.profiles?.username || 'User'}
                        </button>
                        {comment.user_id === session.user.id && (
                          <button type="button" onClick={() => setDeleteTarget(comment.id)} className="p-1 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 transition-colors" aria-label="Delete comment">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed break-words">
                        {comment.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 px-1">
                      <button 
                        onClick={() => toggleCommentLike(comment.id)}
                        className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-500 transition-colors"
                      >
                        <Heart className={`w-3.5 h-3.5 ${commentLikes.some(l => l.comment_id === comment.id && l.user_id === session.user.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                        <span>{commentLikes.filter(l => l.comment_id === comment.id).length}</span>
                      </button>
                      {authorLiked && <span className="text-xs font-medium text-slate-500">Liked by post author</span>}
                      <button 
                        onClick={() => {
                          setReplyingTo(comment);
                          setNewComment('');
                        }}
                        className="text-xs font-medium text-slate-400 hover:text-purple-500 transition-colors"
                      >
                        Reply
                      </button>
                    </div>
                    
                    {/* Replies */}
                    {comments.filter(reply => reply.parent_comment_id === comment.id).map(reply => (
                      <div key={reply.id} className="flex gap-3 mt-3 ml-4 pl-4 border-l-2 border-purple-200 dark:border-purple-800/50">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden flex-shrink-0">
                          {reply.profiles?.avatar_url ? (
                            <img src={reply.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (reply.profiles?.full_name || reply.profiles?.username || 'U')[0].toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-slate-50/70 dark:bg-slate-800/30 rounded-xl px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] font-bold text-slate-800 dark:text-white">
                                {reply.profiles?.full_name || reply.profiles?.display_name || reply.profiles?.username || 'User'}
                              </span>
                              {reply.user_id === session.user.id && (
                                <button type="button" onClick={() => setDeleteTarget(reply.id)} className="p-0.5 text-slate-400 hover:text-rose-500" aria-label="Delete reply">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                              {reply.content}
                            </p>
                          </div>
                          <div className="mt-1">
                            <button 
                              onClick={() => toggleCommentLike(reply.id)}
                              className="flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-rose-500 transition-colors"
                            >
                              <Heart className={`w-3 h-3 ${commentLikes.some(l => l.comment_id === reply.id && l.user_id === session.user.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                              <span>{commentLikes.filter(l => l.comment_id === reply.id).length}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900">Delete comment?</h3>
            <p className="mt-1 text-sm text-slate-500">This comment will be permanently removed.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={async () => { await handleDeleteComment(deleteTarget); setDeleteTarget(null); }} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Comment Input at Bottom */}
      <div className="fixed md:sticky bottom-0 left-0 right-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          {replyingTo && (
            <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-1.5 mb-2">
              <span className="text-xs text-purple-600 dark:text-purple-300">
                Replying to @{replyingTo.profiles?.username || 'user'}
              </span>
              <button 
                onClick={() => setReplyingTo(null)}
                className="hover:bg-purple-200/50 dark:hover:bg-purple-800/50 p-1 rounded-full transition-all"
              >
                <X className="w-3.5 h-3.5 text-purple-500" />
              </button>
            </div>
          )}
          
          <div className="relative flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-full border border-purple-200 dark:border-purple-700 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/25 transition-all overflow-visible">
            <textarea 
              ref={commentInputRef}
              value={newComment}
              onChange={(e) => {
                setNewComment(e.target.value);
                const match = e.target.value.match(/(?:^|\s)@([\w]*)$/);
                setMentionQuery(match ? match[1].toLowerCase() : '');
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 112)}px`;
              }}
              placeholder="Write a comment..."
              rows={1}
              className="flex-1 min-h-[42px] max-h-28 resize-none overflow-y-auto bg-transparent px-4 py-2.5 text-sm leading-5 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            />
            {mentionQuery !== '' && (
              <div className="absolute bottom-full left-3 right-3 mb-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                {comments.map(c => c.profiles).concat(profile).filter(Boolean).filter((p, i, a) => a.findIndex(x => x.id === p.id) === i).filter(p => (p.username || '').toLowerCase().startsWith(mentionQuery)).slice(0, 6).map(p => (
                  <button key={p.id} type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-purple-50" onClick={() => { setNewComment(v => v.replace(/@[\w]*$/, `@${p.username} `)); setMentionQuery(''); }}>
                    <span className="text-sm font-semibold text-slate-800">{p.full_name || p.display_name || p.username}</span>
                    <span className="text-xs text-slate-400">@{p.username}</span>
                  </button>
                ))}
              </div>
            )}
            <button 
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="mr-1 p-2.5 rounded-full bg-purple-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-500/25 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROFILE COMPONENT
// ============================================================
export default function Profile({ session, profileUserId, onMessage }) {
  const [resolvedProfileId, setResolvedProfileId] = useState(null);
  const viewedUserId = resolvedProfileId || (profileUserId && /^[0-9a-f-]{36}$/i.test(profileUserId) ? profileUserId : session.user.id);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [savedPostIds, setSavedPostIds] = useState(new Set());
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('text');
  const [loading, setLoading] = useState(true);
  const isOwnProfile = viewedUserId === session.user.id || profile?.id === session.user.id;
  const isSuspended = ['suspended', 'banned'].includes(String(profile?.account_status || profile?.status || '').toLowerCase());

  async function toggleSavedPost(postId) {
    const saved = savedPostIds.has(postId);
    setSavedPostIds(prev => { const next = new Set(prev); saved ? next.delete(postId) : next.add(postId); return next; });
    if (saved) {
      await supabase.from('bookmarks').delete().eq('post_id', postId).eq('user_id', session.user.id);
    } else {
      await supabase.from('bookmarks').insert([{ post_id: postId, user_id: session.user.id }]);
    }
  }

  async function startVerification(plan) {
    setVerificationLoading(true);
    try {
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = resolve; s.onerror = reject; document.body.appendChild(s); });
      }
      const response = await fetch('/api/razorpay-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, userId: session.user.id }) });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error || 'Could not create payment order');
      new window.Razorpay({ key: import.meta.env.VITE_RAZORPAY_KEY_ID, amount: order.amount, currency: order.currency, name: 'Auragram', description: `${plan === 'yearly' ? 'Yearly' : 'Monthly'} Blue Tick`, order_id: order.id, prefill: { email: session.user.email }, theme: { color: '#8b5cf6' }, handler: () => { alert('Payment successful. Your blue tick will appear shortly after verification.'); } }).open();
    } catch (error) { alert(error.message); } finally { setVerificationLoading(false); }
  }

  // State for post detail view
  const [selectedPostForDetail, setSelectedPostForDetail] = useState(null);

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
  const [blockedByUser, setBlockedByUser] = useState(false);
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
    const reason = reportReason === 'Other' ? `Other: ${reportDetails.trim()}` : reportReason;
    if (reportReason === 'Other' && !reportDetails.trim()) return;
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
    if (mode === 'followers') {
      const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', viewedUserId);
      
      const ids = (data || []).map((row) => row.follower_id);
      const { data: profiles } = ids.length 
        ? await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', ids) 
        : { data: [] };
      
      const profilesWithFollowStatus = await Promise.all((profiles || []).map(async (person) => {
        if (person.id === session.user.id) return { ...person, isFollowing: false };
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', session.user.id)
          .eq('following_id', person.id)
          .maybeSingle();
        return { ...person, isFollowing: !!followData };
      }));
      
      setPeopleList(profilesWithFollowStatus || []);
      setListMode(mode);
      
    } else {
      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', viewedUserId);
      
      const ids = (data || []).map((row) => row.following_id);
      const { data: profiles } = ids.length 
        ? await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', ids) 
        : { data: [] };
      
      const profilesWithFollowStatus = await Promise.all((profiles || []).map(async (person) => {
        if (person.id === session.user.id) return { ...person, isFollowing: false };
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', session.user.id)
          .eq('following_id', person.id)
          .maybeSingle();
        return { ...person, isFollowing: !!followData };
      }));
      
      setPeopleList(profilesWithFollowStatus || []);
      setListMode(mode);
    }
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
      const { data: blockedByRow } = await supabase.from('blocked_users').select('blocker_id').eq('blocker_id', targetId).eq('blocked_id', session.user.id).maybeSingle();
      setBlockedByUser(Boolean(blockedByRow));
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

  // Render single post component - Click to open detail page
  function renderPost(post) {
    return (
      <div 
        key={post.id} 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:ring-2 hover:ring-purple-500/20"
      >
        {/* Post Content Area - Click to open detail */}
        <div 
          onClick={() => setSelectedPostForDetail(post)}
          className="cursor-pointer p-4 sm:p-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden flex-shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  (profile?.full_name || profile?.username || 'U')[0].toUpperCase()
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                  {profile?.full_name || profile?.username || 'User'}
                </h4>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-slate-400">
                    @{profile?.username} · {new Date(post.created_at).toLocaleDateString('en-US', { 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </p>
                  {post.is_pinned && (
                    <span className="inline-flex items-center gap-1 text-[9px] text-amber-600 dark:text-amber-400">
                      <Pin className="w-3 h-3" /> Pinned
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {isOwnProfile && (
              <button 
                onClick={(e) => { e.stopPropagation(); togglePinned(post); }} 
                className={`p-1.5 rounded-full transition-all ${
                  post.is_pinned 
                    ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' 
                    : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10'
                }`}
                title={post.is_pinned ? 'Unpin post' : 'Pin post'}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Media */}
          {post.media_url && (
            <div className="mb-3 -mx-4 sm:-mx-5">
              {post.media_type === 'video' ? (
                <video 
                  src={post.media_url} 
                  className="w-full max-h-[400px] object-contain bg-black"
                  muted 
                  playsInline
                />
              ) : (
                <img 
                  src={post.media_url} 
                  alt="post" 
                  className="w-full max-h-[400px] object-contain bg-black"
                />
              )}
            </div>
          )}

          {/* Content */}
          {post.content && <PostCaption text={post.content} />}
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 pb-3 text-slate-500 text-xs font-medium">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 hover:text-rose-500 cursor-pointer transition-colors">
              <Heart className="w-4 h-4" />
              <span>{post.likes?.length || 0}</span>
            </div>
            <div 
              className="flex items-center space-x-1 hover:text-purple-600 cursor-pointer transition-colors"
              onClick={() => setSelectedPostForDetail(post)}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{post.commentsCount || 0}</span>
            </div>
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setSharePost(post); }} 
              className="hover:text-purple-600 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          
            <button type="button" onClick={(e) => { e.stopPropagation(); toggleSavedPost(post.id); }} className="hover:text-purple-600 transition-colors" aria-label={savedPostIds.has(post.id) ? 'Unsave post' : 'Save post'}>
              <Bookmark className={`w-4 h-4 ${savedPostIds.has(post.id) ? 'fill-purple-600 text-purple-600' : ''}`} />
            </button>
        </div>
      </div>
    );
  }

  return (
    blockedByUser ? <div className="min-h-screen flex items-center justify-center p-6 text-center"><div><h2 className="text-xl font-bold text-slate-800 dark:text-white">User unavailable</h2><p className="mt-2 text-sm text-slate-500">This profile is not available.</p></div></div> :
    <div className="w-full max-w-2xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-20 box-border overflow-x-hidden">
      
      {/* Toast Messages */}
      {pinMessage && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl">{pinMessage}</div>}
      {safetyMessage && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl">{safetyMessage}</div>}
      {profileLinkCopied && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl">Profile link copied</div>}

      {/* PROFILE HEADER CARD */}
      {profile && (
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 rounded-3xl space-y-4 shadow-sm w-full box-border">
          
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <button 
              onClick={copyProfileLink} 
              className="rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 p-2 text-slate-500 hover:text-purple-600 transition-all hover:scale-110"
              title="Copy profile link"
            >
              <Copy className="w-4 h-4" />
            </button>
            
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

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                {profile.is_verified && <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600"><BadgeCheck className="h-4 w-4 fill-blue-500 text-white" /> Verified</span>}
                {profile.account_status === 'suspended' && (
                  <span className="inline-flex mt-1 items-center rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
                    Suspended
                  </span>
                )}
                {profile.bio && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mt-1 break-words whitespace-normal leading-relaxed">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            {!isOwnProfile && (
              <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                {!isSuspended && <><button 
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
                </button></>}
                {isSuspended && <span className="text-xs font-semibold text-rose-500">This account is currently suspended</span>}
                
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
            {isOwnProfile && !profile.is_verified && (
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                <span className="text-xs font-semibold text-slate-500">Get Blue Tick</span>
                <button type="button" disabled={verificationLoading} onClick={() => startVerification('monthly')} className="rounded-full bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">₹49/month</button>
                <button type="button" disabled={verificationLoading} onClick={() => startVerification('yearly')} className="rounded-full border border-blue-200 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-50">₹499/year</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-slate-200/60 dark:border-slate-800 pt-3 text-center">
            <div>
              <b className="block text-sm font-bold text-purple-600">{posts.length}</b>
              <span className="text-[10px] text-slate-500 font-medium">Posts</span>
            </div>
            <button 
              onClick={() => openPeopleList('followers')} 
              className="hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl py-1 transition-all group"
            >
              <b className="block text-sm font-bold text-purple-600 group-hover:text-purple-700 transition-colors">
                {followersCount}
              </b>
              <span className="text-[10px] text-slate-500 font-medium group-hover:text-purple-600 transition-colors">
                Followers
              </span>
            </button>
            <button 
              onClick={() => openPeopleList('following')} 
              className="hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl py-1 transition-all group"
            >
              <b className="block text-sm font-bold text-purple-600 group-hover:text-purple-700 transition-colors">
                {followingCount}
              </b>
              <span className="text-[10px] text-slate-500 font-medium group-hover:text-purple-600 transition-colors">
                Following
              </span>
            </button>
          </div>
        </div>
      )}

      {/* TABS */}
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
              isSuspended ? <div className="mx-auto max-w-xl rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-center text-sm font-semibold text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">This account has been suspended for policy violations.</div> : <p className="text-center text-sm text-slate-400 py-12 font-medium">No text thoughts posted yet.</p>
            ) : (
              textPosts.map(post => renderPost(post))
            )
          )}

          {/* PHOTOS TAB */}
          {activeTab === 'photos' && (
            photoPosts.length === 0 ? (
              isSuspended ? <div className="mx-auto max-w-xl rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-center text-sm font-semibold text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">This account has been suspended for policy violations.</div> : <p className="text-center text-sm text-slate-400 py-12 font-medium">No photo posts found.</p>
            ) : (
              photoPosts.map(post => renderPost(post))
            )
          )}

          {/* REELS TAB */}
          {activeTab === 'reels' && (
            reelPosts.length === 0 ? (
              isSuspended ? <div className="mx-auto max-w-xl rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-center text-sm font-semibold text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">This account has been suspended for policy violations.</div> : <p className="text-center text-sm text-slate-400 py-12 font-medium">No video reels uploaded.</p>
            ) : (
              reelPosts.map(post => renderPost(post))
            )
          )}
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
                <span className="inline-flex items-center justify-center gap-1.5">{shareCopied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />} {shareCopied ? 'Copied!' : 'Copy link'}</span>
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(postShareUrl(sharePost))}`} target="_blank" rel="noreferrer" className="rounded-2xl bg-emerald-500 px-3 py-3 text-center text-sm font-bold text-white hover:bg-emerald-600 transition-all">
                <span className="inline-flex items-center justify-center gap-1.5"><Share2 className="h-4 w-4" /> WhatsApp</span>
              </a>
              <button onClick={nativeSharePost} className="col-span-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-3 text-sm font-bold text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all">
                <span className="inline-flex items-center justify-center gap-1.5"><Share2 className="h-4 w-4" /> More sharing options</span>
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 w-full max-w-md max-h-[75vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                {listMode === 'followers' ? (
                  <>
                    <UserPlus className="w-5 h-5 text-purple-600" />
                    Followers
                  </>
                ) : (
                  <>
                    <UserCheck className="w-5 h-5 text-purple-600" />
                    Following
                  </>
                )}
                <span className="text-sm font-normal text-slate-400">
                  ({peopleList.length})
                </span>
              </h3>
              <button 
                onClick={() => setListMode(null)} 
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-110"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {peopleList.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  No {listMode === 'followers' ? 'followers' : 'following'} yet
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {listMode === 'followers' 
                    ? 'When someone follows you, they\'ll appear here' 
                    : 'When you follow someone, they\'ll appear here'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {peopleList.map((person) => (
                  <div 
                    key={person.id} 
                    onClick={() => {
                      setListMode(null);
                      window.location.href = `/profile/${person.username}`;
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0 ring-2 ring-purple-500/20 group-hover:ring-purple-500/40 transition-all">
                      {person.avatar_url ? (
                        <img src={person.avatar_url} alt={person.username} className="w-full h-full object-cover" />
                      ) : (
                        (person.full_name || person.username || 'U')[0].toUpperCase()
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                        {person.full_name || person.username}
                      </p>
                      <p className="text-xs text-slate-400 truncate">@{person.username}</p>
                    </div>
                    
                    {person.id !== session.user.id && (
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          const newState = !person.isFollowing;
                          setPeopleList(prev => prev.map(p => 
                            p.id === person.id ? { ...p, isFollowing: newState } : p
                          ));
                          if (newState) {
                            await supabase
                              .from('follows')
                              .insert([{ follower_id: session.user.id, following_id: person.id }]);
                          } else {
                            await supabase
                              .from('follows')
                              .delete()
                              .eq('follower_id', session.user.id)
                              .eq('following_id', person.id);
                          }
                          const [{ count: followers }, { count: following }] = await Promise.all([
                            supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', viewedUserId),
                            supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', viewedUserId)
                          ]);
                          setFollowersCount(followers || 0);
                          setFollowingCount(following || 0);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 ${
                          person.isFollowing 
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600' 
                            : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-500/25'
                        }`}
                      >
                        {person.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          POST DETAIL VIEW - Full page overlay
          ============================================================ */}
      {selectedPostForDetail && (
        <PostDetail
          post={selectedPostForDetail}
          profile={profile}
          session={session}
          onBack={() => setSelectedPostForDetail(null)}
          onShare={setSharePost}
          onReport={setReportPost}
          onViewProfile={(id) => { setSelectedPostForDetail(null); setResolvedProfileId(id); }}
        />
      )}

    </div>
  );
}
