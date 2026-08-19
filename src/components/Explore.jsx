import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Heart, MessageCircle, Loader2, X, Send, UserPlus, UserCheck } from 'lucide-react';

export default function Explore({ session, onViewProfile }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const [selectedPost, setSelectedPost] = useState(null);
  const [postComments, setPostComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    fetchExploreData();
    fetchFollows();
  }, [session?.user?.id]);

  async function fetchFollows() {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', session.user.id);
    if (data) setFollowingIds(new Set(data.map(f => f.following_id)));
  }

  async function fetchExploreData() {
    setLoading(true);
    const [profilesRes, postsRes, likesRes, commentsRes] = await Promise.all([
      supabase.from('profiles').select('*').neq('id', session.user.id).limit(15),
      supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(30),
      supabase.from('likes').select('post_id, user_id'),
      supabase.from('comments').select('id, post_id')
    ]);

    const profilesData = profilesRes.data || [];
    const postsData = postsRes.data || [];
    const likesData = likesRes.data || [];
    const commentsData = commentsRes.data || [];

    const profilesMap = profilesData.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

    const formattedPosts = postsData.map(post => ({
      ...post,
      profiles: profilesMap[post.user_id] || null,
      likes: likesData.filter(l => l.post_id === post.id),
      commentsCount: commentsData.filter(c => c.post_id === post.id).length
    }));

    setUsers(profilesData);
    setPosts(formattedPosts);
    setLoading(false);
  }

  async function handleToggleFollow(targetUserId) {
    const isFollowing = followingIds.has(targetUserId);
    setFollowingIds(prev => {
      const next = new Set(prev);
      if (isFollowing) next.delete(targetUserId);
      else next.add(targetUserId);
      return next;
    });

    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', targetUserId);
    } else {
      await supabase.from('follows').insert([{ follower_id: session.user.id, following_id: targetUserId }]);
      await supabase.from('notifications').insert([{ recipient_id: targetUserId, actor_id: session.user.id, type: 'follow', is_read: false }]);
    }
  }

  async function handleOpenPost(post) {
    setSelectedPost(post);
    setLoadingComments(true);
    const { data: commentsData } = await supabase.from('comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });
    if (commentsData && commentsData.length > 0) {
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: cProfiles } = await supabase.from('profiles').select('*').in('id', userIds);
      const cProfilesMap = (cProfiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      setPostComments(commentsData.map(c => ({ ...c, profiles: cProfilesMap[c.user_id] || null })));
    } else setPostComments([]);
    setLoadingComments(false);
  }

  async function handleAddComment() {
    if (!newComment.trim() || !selectedPost) return;
    const { data, error } = await supabase.from('comments').insert([{ post_id: selectedPost.id, user_id: session.user.id, content: newComment.trim() }]).select().single();
    if (!error && data) {
      const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setPostComments([...postComments, { ...data, profiles: myProfile }]);
      setNewComment('');
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, commentsCount: p.commentsCount + 1 } : p));
    }
  }

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPosts = posts.filter(p => {
    const matchesSearch = p.content?.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeFilter === 'media') return matchesSearch && !!p.media_url;
    if (activeFilter === 'text') return matchesSearch && !p.media_url;
    return matchesSearch;
  });

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 space-y-5 max-w-2xl mx-auto pb-24 bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
      {/* Light / Night Mode Responsive Sticky Header */}
      <div className="space-y-4 sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md pt-2 pb-3 z-10 border-b border-slate-200 dark:border-slate-800 rounded-b-2xl">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Explore & Search</h2>
        
        {/* Responsive Search Box */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users, media, or thoughts..."
            className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'All' },
            { id: 'users', label: 'People' },
            { id: 'media', label: 'Media' },
            { id: 'text', label: 'Text Thoughts' }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition flex-shrink-0 ${
                activeFilter === filter.id
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* People Section */}
          {(activeFilter === 'all' || activeFilter === 'users') && (
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">People ({filteredUsers.length})</h3>
              {filteredUsers.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-2">No users found.</p>
              ) : (
                <div className="space-y-2.5">
                  {filteredUsers.map(user => {
                    const isFollowing = followingIds.has(user.id);
                    return (
                      <div key={user.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 shadow-2xs">
                        <div onClick={() => onViewProfile?.(user.id)} className="flex items-center space-x-3 cursor-pointer min-w-0 flex-1">
                          <div className="w-11 h-11 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm overflow-hidden flex-shrink-0">
                            {user.avatar_url ? <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" /> : (user.username || 'U')[0].toUpperCase()}
                          </div>
                          <div className="truncate min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.full_name || user.username || 'User'}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">@{user.username}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleFollow(user.id)}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center space-x-1.5 ${
                            isFollowing ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200' : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          {isFollowing ? <><UserCheck className="w-3.5 h-3.5 text-emerald-500" /><span>Following</span></> : <><UserPlus className="w-3.5 h-3.5" /><span>Follow</span></>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Posts Section */}
          {(activeFilter === 'all' || activeFilter === 'media' || activeFilter === 'text') && (
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Posts ({filteredPosts.length})</h3>
              {filteredPosts.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-2">No posts found.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  {filteredPosts.map(post => (
                    <div key={post.id} onClick={() => handleOpenPost(post)} className="relative group aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-2xs bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                      {post.media_url ? (
                        post.media_type === 'video' ? <video src={post.media_url} className="w-full h-full object-cover" /> : <img src={post.media_url} alt="post" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full p-3.5 flex flex-col justify-between bg-gradient-to-br from-purple-700 via-indigo-800 to-purple-900 text-white">
                          <p className="text-[10px] font-bold line-clamp-4 italic">"{post.content}"</p>
                          <span className="text-[8px] uppercase text-purple-200 font-mono">@{post.profiles?.username}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white space-x-3">
                        <div className="flex items-center space-x-1 text-xs font-bold"><Heart className="w-4 h-4 fill-white" /><span>{post.likes?.length || 0}</span></div>
                        <div className="flex items-center space-x-1 text-xs font-bold"><MessageCircle className="w-4 h-4 fill-white" /><span>{post.commentsCount || 0}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Post Details Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden max-w-2xl w-full max-h-[85vh] flex flex-col md:flex-row relative shadow-2xl border border-slate-100 dark:border-slate-800">
            <button onClick={() => setSelectedPost(null)} className="absolute top-3 right-3 bg-black/60 text-white p-1.5 rounded-full z-20"><X className="w-4 h-4" /></button>
            <div className="md:w-1/2 bg-black flex items-center justify-center min-h-[260px]">
              {selectedPost.media_url ? (
                selectedPost.media_type === 'video' ? <video src={selectedPost.media_url} controls autoPlay className="w-full max-h-[85vh] object-contain" /> : <img src={selectedPost.media_url} alt="post" className="w-full max-h-[85vh] object-contain" />
              ) : (
                <div className="p-6 bg-gradient-to-tr from-purple-900 to-indigo-900 text-white text-center italic">"{selectedPost.content}"</div>
              )}
            </div>
            <div className="md:w-1/2 p-4 flex flex-col justify-between bg-white dark:bg-slate-900">
              <div className="space-y-3 overflow-hidden flex-1 flex flex-col">
                <div className="flex items-center space-x-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">{(selectedPost.profiles?.username || 'U')[0].toUpperCase()}</div>
                  <div><h4 className="text-xs font-bold text-slate-800 dark:text-white">@{selectedPost.profiles?.username}</h4></div>
                </div>
                {selectedPost.content && <p className="text-xs text-slate-700 dark:text-slate-300">{selectedPost.content}</p>}
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {loadingComments ? <p className="text-xs text-slate-400 py-4 text-center">Loading...</p> : postComments.map(c => (
                    <div key={c.id} className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                      <span className="font-bold block text-purple-600 dark:text-purple-400">@{c.profiles?.username}</span>
                      <span className="text-slate-700 dark:text-slate-300">{c.content}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add comment..." className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1.5 text-xs text-slate-800 dark:text-white" onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} />
                <button onClick={handleAddComment} className="bg-purple-600 text-white p-2 rounded-full"><Send className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
