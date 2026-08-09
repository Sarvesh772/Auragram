import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Heart, MessageCircle, Loader2, X, Send, FileText, Sparkles } from 'lucide-react';

export default function Explore({ session }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'users', 'media', 'text'
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Post for Modal View
  const [selectedPost, setSelectedPost] = useState(null);
  const [postComments, setPostComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    fetchExploreData();
  }, []);

  async function fetchExploreData() {
    setLoading(true);

    const [profilesRes, postsRes, likesRes, commentsRes] = await Promise.all([
      supabase.from('profiles').select('*').limit(12),
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

  // Filtered Users
  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered Posts based on Filter & Search
  const filteredPosts = posts.filter(p => {
    const matchesSearch = p.content?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'media') {
      return matchesSearch && !!p.media_url;
    }
    if (activeFilter === 'text') {
      return matchesSearch && !p.media_url;
    }
    return matchesSearch;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      {/* Search Header */}
      <div className="space-y-4 sticky top-0 bg-white/90 backdrop-blur-md pt-2 pb-3 z-10">
        <h2 className="text-xl font-black text-slate-800">Explore & Search</h2>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users, media, or text thoughts..."
            className="w-full bg-slate-100 rounded-full pl-11 pr-4 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
          />
        </div>

        {/* Filter Pills with "Text" option */}
        <div className="flex space-x-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'users', label: 'People' },
            { id: 'media', label: 'Media' },
            { id: 'text', label: 'Text Thoughts' }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex-shrink-0 ${
                activeFilter === filter.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
          <Loader2 className="w-7 h-7 animate-spin text-purple-600" />
          <p className="text-xs font-semibold">Loading content...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* USERS */}
          {(activeFilter === 'all' || activeFilter === 'users') && (
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                People ({filteredUsers.length})
              </h3>
              {filteredUsers.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No users found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredUsers.map(user => (
                    <div key={user.id} className="flex items-center space-x-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-purple-200 transition">
                      <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm overflow-hidden flex-shrink-0">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          (user.username || 'U')[0].toUpperCase()
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 truncate">{user.username || 'User'}</p>
                        <p className="text-[10px] text-slate-400 truncate">{user.full_name || `@${user.username}`}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* POSTS GRID */}
          {(activeFilter === 'all' || activeFilter === 'media' || activeFilter === 'text') && (
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                {activeFilter === 'text' ? 'Text Thoughts' : activeFilter === 'media' ? 'Photos & Videos' : 'Explore Feed'} ({filteredPosts.length})
              </h3>
              {filteredPosts.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No posts found in this category.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  {filteredPosts.map(post => (
                    <div 
                      key={post.id} 
                      onClick={() => handleOpenPost(post)}
                      className="relative group aspect-square rounded-2xl overflow-hidden cursor-pointer transition transform hover:scale-[1.02] shadow-sm"
                    >
                      {post.media_url ? (
                        post.media_type === 'video' ? (
                          <video src={post.media_url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={post.media_url} alt="post" className="w-full h-full object-cover" />
                        )
                      ) : (
                        /* Stylish Gradient Text Preview Card */
                        <div className="w-full h-full p-3.5 flex flex-col justify-between bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
                          <div className="absolute top-2 right-2 text-white/20">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <p className="text-[11px] font-bold line-clamp-4 leading-relaxed text-slate-100 font-serif italic">
                            "{post.content}"
                          </p>
                          <div className="flex items-center space-x-1.5 text-white/70">
                            <span className="text-[9px] font-semibold tracking-wide uppercase">@{post.profiles?.username || 'thought'}</span>
                          </div>
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white space-x-3 backdrop-blur-[2px]">
                        <div className="flex items-center space-x-1 font-bold text-xs">
                          <Heart className="w-4 h-4 fill-white" />
                          <span>{post.likes?.length || 0}</span>
                        </div>
                        <div className="flex items-center space-x-1 font-bold text-xs">
                          <MessageCircle className="w-4 h-4 fill-white" />
                          <span>{post.commentsCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* POPUP MODAL FOR TAP TO VIEW */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full max-h-[85vh] flex flex-col md:flex-row relative shadow-2xl">
            {/* Close Button */}
            <button 
              onClick={() => setSelectedPost(null)}
              className="absolute top-3 right-3 bg-black/60 hover:bg-black text-white p-1.5 rounded-full z-20 transition"
            >
              <X className="w-4 h-4" />
            </button>

           {/* Left Side: Media OR Gradient Text Card */}
<div className="md:w-1/2 bg-black flex items-center justify-center min-h-[280px] max-h-[85vh] relative overflow-hidden">
  {selectedPost.media_url ? (
    selectedPost.media_type === 'video' ? (
      <video src={selectedPost.media_url} controls autoPlay className="w-full max-h-[85vh] object-contain" />
    ) : (
      <img src={selectedPost.media_url} alt="post" className="w-full max-h-[85vh] object-contain" />
    )
  ) : (
    /* Scrollable Dynamic Text Card */
    <div className="w-full h-full min-h-[300px] max-h-[85vh] p-6 bg-gradient-to-tr from-purple-950 via-indigo-900 to-slate-900 text-white flex flex-col justify-between relative">
      <Sparkles className="w-5 h-5 text-purple-400/50 absolute top-4 left-4" />
      
      {/* Scrollable Container */}
      <div className="my-auto overflow-y-auto max-h-[320px] pr-2 custom-scrollbar space-y-3 py-4">
        <p className="text-sm md:text-base font-semibold font-serif leading-relaxed text-slate-100 italic text-center">
          "{selectedPost.content}"
        </p>
      </div>

      <div className="text-center pt-2 border-t border-white/10">
        <span className="text-[11px] text-purple-300 font-bold tracking-wider uppercase">
          Post by — @{selectedPost.profiles?.username || 'thought'}
        </span>
      </div>
    </div>
  )}
</div>

            {/* Right Side: Details & Comments */}
            <div className="md:w-1/2 p-4 flex flex-col justify-between h-[380px] md:h-auto bg-white">
              <div className="space-y-3 overflow-hidden flex-1 flex flex-col">
                {/* User Info Header */}
                <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden">
                    {selectedPost.profiles?.avatar_url ? (
                      <img src={selectedPost.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      (selectedPost.profiles?.username || 'U')[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">@{selectedPost.profiles?.username || 'user'}</h4>
                    <p className="text-[10px] text-slate-400">{new Date(selectedPost.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Caption / Content (If post had media) */}
                {selectedPost.media_url && selectedPost.content && (
                  <p className="text-xs text-slate-700 font-medium leading-relaxed flex-shrink-0">{selectedPost.content}</p>
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
                            (c.profiles?.username || 'U')[0].toUpperCase()
                          )}
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl flex-1">
                          <span className="font-bold text-[11px] text-slate-800 block">@{c.profiles?.username || 'user'}</span>
                          <span className="text-slate-600 text-[11px]">{c.content}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Comment Input */}
              <div className="flex items-center space-x-2 pt-3 border-t border-slate-100 mt-2 flex-shrink-0">
                <input 
                  type="text" 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-slate-100 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
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
    </div>
  );
}