import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import Story from './Story';
import { Image as ImageIcon, Video, MessageCircle, Send, Heart, Bookmark, X, Loader2, Trash2 } from 'lucide-react';
import MentionInput from './MentionInput';
import { RenderFormattedText } from './MentionInput';

// Extract @mentions and notify tagged users
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

export default function Feed({ session, onViewProfile }) {
  const [posts, setPosts] = useState([]);
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState(new Set());
  const [newContent, setNewContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [postError, setPostError] = useState('');

  // Comments State
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [commentTextMap, setCommentTextMap] = useState({});
  const [loadingComments, setLoadingComments] = useState({});

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const displayUsername = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || 'User';

  useEffect(() => {
    fetchPosts();
    fetchBookmarks();
  }, []);

  async function fetchBookmarks() {
    const { data } = await supabase
      .from('bookmarks')
      .select('post_id')
      .eq('user_id', session.user.id);

    if (data) {
      setBookmarkedPostIds(new Set(data.map(b => b.post_id)));
    }
  }

  async function handleToggleBookmark(postId) {
    const isBookmarked = bookmarkedPostIds.has(postId);
    const newSet = new Set(bookmarkedPostIds);

    if (isBookmarked) {
      newSet.delete(postId);
      setBookmarkedPostIds(newSet);
      await supabase.from('bookmarks').delete().eq('user_id', session.user.id).eq('post_id', postId);
    } else {
      newSet.add(postId);
      setBookmarkedPostIds(newSet);
      await supabase.from('bookmarks').insert([{ user_id: session.user.id, post_id: postId }]);
    }
  }

  async function fetchPosts() {
    setLoading(true);

    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsError || !postsData) {
      setLoading(false);
      return;
    }

    const userIds = [...new Set(postsData.map(p => p.user_id))];
    const postIds = postsData.map(p => p.id);

    const [profilesRes, likesRes, commentsRes] = await Promise.all([
      supabase.from('profiles').select('*').in('id', userIds),
      supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
      supabase.from('comments').select('id, post_id').in('post_id', postIds)
    ]);

    const profilesMap = (profilesRes.data || []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});

    const formattedPosts = postsData.map(post => ({
      ...post,
      profiles: profilesMap[post.user_id] || null,
      likes: (likesRes.data || []).filter(l => l.post_id === post.id),
      comments: (commentsRes.data || []).filter(c => c.post_id === post.id)
    }));

    setPosts(formattedPosts);
    setLoading(false);
  }

  async function handleToggleLike(post) {
    const isLiked = post.likes?.some(like => like.user_id === session.user.id);

    setPosts(prevPosts => prevPosts.map(p => {
      if (p.id === post.id) {
        const updatedLikes = isLiked
          ? p.likes.filter(l => l.user_id !== session.user.id)
          : [...p.likes, { user_id: session.user.id }];
        return { ...p, likes: updatedLikes };
      }
      return p;
    }));

    if (isLiked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', session.user.id);
    } else {
      await supabase.from('likes').insert([{ post_id: post.id, user_id: session.user.id }]);
    }
  }

  async function toggleCommentsView(postId) {
    if (activeCommentPostId === postId) {
      setActiveCommentPostId(null);
      return;
    }

    setActiveCommentPostId(postId);
    setLoadingComments(prev => ({ ...prev, [postId]: true }));

    const { data: commentsData } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
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

      setCommentsMap(prev => ({ ...prev, [postId]: fullComments }));
    } else {
      setCommentsMap(prev => ({ ...prev, [postId]: [] }));
    }

    setLoadingComments(prev => ({ ...prev, [postId]: false }));
  }

  async function handleAddComment(post) {
    const postId = post.id;
    const text = commentTextMap[postId];
    if (!text || !text.trim()) return;

    const newCommentObj = {
      post_id: postId,
      user_id: session.user.id,
      content: text.trim()
    };

    const { data, error } = await supabase.from('comments').insert([newCommentObj]).select().single();
    if (!error && data) {
      await processMentions(text, session.user.id, postId);
      const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      const createdComment = { ...data, profiles: myProfile };

      setCommentsMap(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), createdComment]
      }));
      setCommentTextMap(prev => ({ ...prev, [postId]: '' }));

      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...p.comments, { id: data.id }] } : p));
    }
  }

  async function handleDeleteComment(postId, commentId) {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      setCommentsMap(prev => ({
        ...prev,
        [postId]: prev[postId].filter(c => c.id !== commentId)
      }));

      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: p.comments.filter(c => c.id !== commentId) } : p));
    }
  }

  function handleFileSelect(e, type) {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setFileType(type);
    setFilePreview(URL.createObjectURL(file));
  }

  function handleRemoveFile() {
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  }

  async function handleCreatePost() {
    if (!newContent.trim() && !selectedFile) return;
    setPostError('');
    setUploading(true);

    let mediaUrl = null;
    let finalMediaType = null;

    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('media').upload(filePath, selectedFile);

      if (uploadError) {
        setPostError('Upload failed: ' + uploadError.message);
        setUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
      mediaUrl = publicUrlData.publicUrl;
      finalMediaType = fileType;
    }

    const { data: createdPost, error: insertError } = await supabase.from('posts').insert([
      {
        user_id: session.user.id,
        content: newContent,
        media_url: mediaUrl,
        media_type: finalMediaType
      }
    ]).select('id').single();

    setUploading(false);

    if (!insertError && createdPost) {
      await processMentions(newContent, session.user.id, createdPost.id);
      setNewContent('');
      handleRemoveFile();
      fetchPosts();
    } else if (insertError) {
      setPostError(insertError.message);
    }
  }

  async function handleSharePost(post) {
    const url = `${window.location.origin}${window.location.pathname}#post-${post.id}`;
    if (navigator.share) await navigator.share({ title: 'Auragram post', text: post.content || 'Check this post', url });
    else await navigator.clipboard?.writeText(url);
  }

  return (
    <div className="p-4 space-y-6">
      <input type="file" accept="image/*" ref={imageInputRef} onChange={(e) => handleFileSelect(e, 'image')} className="hidden" />
      <input type="file" accept="video/*" ref={videoInputRef} onChange={(e) => handleFileSelect(e, 'video')} className="hidden" />

      {/* Stories Section */}
      <Story session={session} />

      {/* Create Post Input */}
      <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        {postError && <p className="text-xs text-rose-500 mb-2 font-medium">{postError}</p>}
        
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm">
            {displayUsername[0]?.toUpperCase()}
          </div>
          <MentionInput
            value={newContent}
            onChange={setNewContent}
            placeholder="What's orbiting your mind? (Use @ to mention)"
            currentUserId={session.user.id}
            className="w-full bg-transparent focus:outline-none text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm font-medium"
          />
        </div>

        {filePreview && (
          <div className="relative mb-3 rounded-xl overflow-hidden border border-slate-200 bg-black/5 max-h-60 flex items-center justify-center">
            <button onClick={handleRemoveFile} className="absolute top-2 right-2 bg-slate-900/80 text-white p-1 rounded-full hover:bg-slate-900 z-10">
              <X className="w-4 h-4" />
            </button>
            {fileType === 'image' ? (
              <img src={filePreview} alt="Preview" className="max-h-60 object-contain w-full" />
            ) : (
              <video src={filePreview} controls className="max-h-60 w-full" />
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-3 border-t border-slate-200">
          <div className="flex space-x-4">
            <button onClick={() => imageInputRef.current?.click()} className="flex items-center space-x-1 text-purple-600 font-medium text-xs md:text-sm">
              <ImageIcon className="w-4 h-4" /> <span>Photo</span>
            </button>
            <button onClick={() => videoInputRef.current?.click()} className="flex items-center space-x-1 text-rose-500 font-medium text-xs md:text-sm">
              <Video className="w-4 h-4" /> <span>Video</span>
            </button>
          </div>
          <button 
            onClick={handleCreatePost} 
            disabled={uploading}
            className="bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold px-5 py-1.5 rounded-full text-sm flex items-center space-x-2 disabled:opacity-50"
          >
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Uploading...</span></> : <span>Post</span>}
          </button>
        </div>
      </div>

      {/* Live Posts List */}
      {loading ? (
        <p className="text-center text-slate-400 py-10">Loading real posts from Supabase...</p>
      ) : posts.length === 0 ? (
        <p className="text-center text-slate-400 py-10">No posts yet. Create one above!</p>
      ) : (
        posts.map((post) => {
          const isLikedByMe = post.likes?.some(like => like.user_id === session.user.id);
          const isBookmarkedByMe = bookmarkedPostIds.has(post.id);
          const likesCount = post.likes?.length || 0;
          const commentsCount = post.comments?.length || 0;

          return (
            <div key={post.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <button onClick={() => onViewProfile?.(post.user_id)} className="flex items-center space-x-3 text-left">
                  {post.profiles?.avatar_url ? (
                    <img src={post.profiles.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="avatar" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-bold flex items-center justify-center text-sm">
                      {(post.profiles?.username || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-sm text-slate-800 dark:text-white">{post.profiles?.full_name || post.profiles?.username || 'User'}</p>
                    <p className="text-xs text-slate-400">{new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </button>
              </div>
              
              {post.content && (
                <div className="px-4 pb-3">
                  <p className="text-slate-700 dark:text-slate-200 text-sm">
                    <RenderFormattedText text={post.content} onViewProfile={onViewProfile} />
                  </p>
                </div>
              )}
              
              {post.media_url && (
                post.media_type === 'video' ? (
                  <video src={post.media_url} controls className="w-full max-h-[450px] bg-black" />
                ) : (
                  <img src={post.media_url} className="w-full object-cover max-h-[450px]" alt="Post media" />
                )
              )}

              {/* Actions */}
              <div className="p-4 border-t border-slate-50 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-5">
                    <button onClick={() => handleToggleLike(post)} className="flex items-center space-x-1.5 transition active:scale-125">
                      <Heart className={`w-6 h-6 transition-colors ${isLikedByMe ? 'text-red-500 fill-red-500' : 'text-slate-600 hover:text-red-500'}`} />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{likesCount}</span>
                    </button>

                    <button onClick={() => toggleCommentsView(post.id)} className="flex items-center space-x-1.5 text-slate-600 hover:text-purple-600">
                      <MessageCircle className="w-6 h-6" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{commentsCount}</span>
                    </button>

                    <button onClick={() => handleSharePost(post)} title="Share post"><Send className="w-6 h-6 text-slate-600 hover:text-purple-600 cursor-pointer" /></button>
                  </div>

                  {/* Bookmark Button */}
                  <button onClick={() => handleToggleBookmark(post.id)} className="transition active:scale-110">
                    <Bookmark className={`w-6 h-6 cursor-pointer ${isBookmarkedByMe ? 'text-purple-600 fill-purple-600' : 'text-slate-600 hover:text-slate-900'}`} />
                  </button>
                </div>

                {/* Comments Drawer */}
                {activeCommentPostId === post.id && (
                  <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 p-3 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comments ({commentsCount})</h4>

                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                      {loadingComments[post.id] ? (
                        <p className="text-xs text-slate-400 text-center py-3">Loading comments...</p>
                      ) : (commentsMap[post.id] || []).length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-3">No comments yet. Start the conversation!</p>
                      ) : (
                        commentsMap[post.id].map(comment => (
                          <div key={comment.id} className="flex justify-between items-start group">
                            <div className="flex space-x-2.5 items-start">
                              {comment.profiles?.avatar_url ? (
                                <img src={comment.profiles.avatar_url} className="w-7 h-7 rounded-full object-cover mt-0.5" alt="c-avatar" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-purple-200 text-purple-700 font-bold flex items-center justify-center text-[10px]">
                                  {(comment.profiles?.username || 'U')[0].toUpperCase()}
                                </div>
                              )}
                              <div className="bg-blue-50 p-2.5 rounded-2xl border border-slate-100 shadow-2xs max-w-[280px]">
                                <span className="font-bold text-xs text-slate-800 block">{comment.profiles?.username || 'User'}</span>
                                <p className="text-xs text-slate-600 dark:text-slate-200 mt-0.5 leading-snug">
                                  <RenderFormattedText text={comment.content} onViewProfile={onViewProfile} />
                                </p>
                              </div>
                            </div>

                            {comment.user_id === session.user.id && (
                              <button 
                                onClick={() => handleDeleteComment(post.id, comment.id)}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-1 transition"
                                title="Delete Comment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-200/60">
                      <MentionInput
                        value={commentTextMap[post.id] || ''}
                        onChange={(val) => setCommentTextMap({ ...commentTextMap, [post.id]: val })}
                        placeholder="Add a comment... (use @ to tag)"
                        onSend={() => handleAddComment(post)}
                        currentUserId={session.user.id}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-purple-500 shadow-2xs"
                      />
                      <button 
                        onClick={() => handleAddComment(post)}
                        className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full transition shadow-md shadow-purple-200 flex items-center justify-center"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}