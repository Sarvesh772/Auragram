import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Hash, User, Grid, Heart, MessageCircle, TrendingUp, Users, Image, Loader2, X } from 'lucide-react';
import { RenderFormattedText } from './MentionInput';

export default function Explore({ session, onViewProfile }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    fetchExploreData();
  }, []);

  async function fetchExploreData() {
    setLoading(true);
    const [{ data: blockedOut }, { data: blockedIn }] = await Promise.all([
      supabase.from('blocked_users').select('blocked_id').eq('blocker_id', session.user.id),
      supabase.from('blocked_users').select('blocker_id').eq('blocked_id', session.user.id)
    ]);
    const blockedIds = new Set([...(blockedOut || []).map(r => r.blocked_id), ...(blockedIn || []).map(r => r.blocker_id)]);

    const { data: usersData } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio')
      .neq('id', session.user.id)
      .limit(20);
    const visibleUsersData = (usersData || []).filter(u => !blockedIds.has(u.id));

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (postsData) {
      const visiblePostsData = postsData.filter(p => !blockedIds.has(p.user_id));
      const userIds = [...new Set(visiblePostsData.map(p => p.user_id))];
      const postIds = visiblePostsData.map(p => p.id);

      const [profilesRes, likesRes, commentsRes] = await Promise.all([
        supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds),
        supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
        supabase.from('comments').select('id, post_id').in('post_id', postIds)
      ]);

      const profilesMap = (profilesRes.data || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

      const formattedPosts = visiblePostsData.map(post => {
        let mediaList = [];
        if (post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
          mediaList = post.media_urls;
        } else if (post.media_url) {
          mediaList = [{ url: post.media_url, type: post.media_type || 'image' }];
        }

        return {
          ...post,
          mediaList,
          profiles: profilesMap[post.user_id] || null,
          likesCount: (likesRes.data || []).filter(l => l.post_id === post.id).length,
          commentsCount: (commentsRes.data || []).filter(c => c.post_id === post.id).length
        };
      });

      setPosts(formattedPosts);

      const tagCounts = {};
      visiblePostsData.forEach(p => {
        if (p.content) {
          const tags = p.content.match(/#([a-zA-Z0-9_]+)/g);
          if (tags) {
            tags.forEach(tag => {
              const cleaned = tag.toLowerCase();
              tagCounts[cleaned] = (tagCounts[cleaned] || 0) + 1;
            });
          }
        }
      });

      const sortedTags = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);

      setTrendingTags(sortedTags);
    }

    setUsers(visibleUsersData);
    setLoading(false);
  }

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPosts = posts.filter(p => 
    p.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTags = trendingTags.filter(t => 
    t.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFilteredContent = () => {
    switch(activeFilter) {
      case 'users':
        return { users: filteredUsers, posts: [], tags: [] };
      case 'hashtags':
        return { users: [], posts: [], tags: filteredTags };
      case 'posts':
        return { users: [], posts: filteredPosts, tags: [] };
      default:
        return { users: filteredUsers, posts: filteredPosts, tags: filteredTags };
    }
  };

  const { users: displayUsers, posts: displayPosts, tags: displayTags } = getFilteredContent();

  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-slate-50 dark:bg-slate-950 px-2.5 py-3 sm:p-4 md:p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
            Explore
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">Discover</span>
          </div>
        </div>

        {/* SEARCH INPUT BAR */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search accounts, #hashtags, posts..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl pl-10 sm:pl-12 pr-10 py-3 sm:py-3.5 text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600/50 focus:border-transparent transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* FILTER TABS */}
        <div className="flex gap-1.5 sm:gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5 sm:pb-3 overflow-x-auto scrollbar-hide">
          {[
            { id: 'all', icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Top' },
            { id: 'users', icon: <User className="w-3.5 h-3.5" />, label: 'Accounts' },
            { id: 'hashtags', icon: <Hash className="w-3.5 h-3.5" />, label: 'Hashtags' },
            { id: 'posts', icon: <Grid className="w-3.5 h-3.5" />, label: 'Posts' }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
                className={`shrink-0 flex items-center gap-1 px-2.5 sm:gap-1.5 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-200 ${
                activeFilter === filter.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {filter.icon}
              <span>{filter.label}</span>
            </button>
          ))}
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <p className="text-sm text-slate-400 mt-3 font-medium">Loading explore...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* HASHTAGS SECTION */}
            {displayTags.length > 0 && (activeFilter === 'all' || activeFilter === 'hashtags') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                      Trending Hashtags
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">{activeFilter === 'hashtags' ? displayTags.length : Math.min(displayTags.length, 6)} tags</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(activeFilter === 'hashtags' ? displayTags : displayTags.slice(0, 6)).map((t, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSearchQuery(t.tag)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-md transition-all duration-200 text-left"
                    >
                      <div>
                        <p className="font-bold text-xs text-purple-600 dark:text-purple-400">{t.tag}</p>
                        <p className="text-[10px] text-slate-400">{t.count} {t.count === 1 ? 'post' : 'posts'}</p>
                      </div>
                      <Hash className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ACCOUNTS SECTION */}
            {displayUsers.length > 0 && (activeFilter === 'all' || activeFilter === 'users') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                      Accounts
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">{displayUsers.length} users</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {displayUsers.map(user => (
                    <div
                      key={user.id}
                      onClick={() => onViewProfile?.(user.id)}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500 cursor-pointer transition-all duration-200 hover:shadow-md"
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm overflow-hidden flex-shrink-0">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          (user.username || 'U')[0].toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-800 dark:text-white truncate">
                          {user.full_name || user.username}
                        </p>
                        <p className="text-xs text-slate-400 truncate">@{user.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* POSTS GRID SECTION */}
            {displayPosts.length > 0 && (activeFilter === 'all' || activeFilter === 'posts') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Grid className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                      Posts
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">{displayPosts.length} posts</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden">
                  {displayPosts.map(post => {
                    const media = post.mediaList?.[0];
                    const hasMedia = media && media.url;
                    
                    return (
                      <div
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className="relative aspect-square bg-slate-100 dark:bg-slate-800 group overflow-hidden cursor-pointer"
                      >
                        {hasMedia ? (
                          // MEDIA POSTS - Show image/video
                          <>
                            {media.type === 'video' ? (
                              <video src={media.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <img src={media.url} alt="post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            )}
                            
                            {/* Overlay for media posts */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4 text-white">
                              <div className="flex items-center gap-1.5 text-xs font-bold">
                                <Heart className="w-4 h-4 fill-white" />
                                <span>{post.likesCount}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs font-bold">
                                <MessageCircle className="w-4 h-4 fill-white" />
                                <span>{post.commentsCount}</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          // TEXT POSTS - Only content, clean preview
                          <div className="w-full h-full bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 flex items-center justify-center">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-6 leading-relaxed text-center">
                              <RenderFormattedText text={post.content} onViewProfile={onViewProfile} />
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* NO RESULTS FOUND */}
            {displayUsers.length === 0 && displayPosts.length === 0 && displayTags.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-3">
                  <Search className="w-8 h-8 text-purple-400" />
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  No results found for "{searchQuery}"
                </p>
                <p className="text-xs text-slate-400 mt-1">Try searching for something else</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* POST DETAIL MODAL */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedPost(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
              {/* Modal - Media */}
              <div className="flex-1 bg-black flex items-center justify-center p-2 min-h-[300px] md:min-h-0">
                {selectedPost.mediaList?.[0]?.type === 'video' ? (
                  <video src={selectedPost.mediaList[0].url} playsInline muted className="max-h-full max-w-full rounded-lg" />
                ) : selectedPost.mediaList?.[0]?.url ? (
                  <img src={selectedPost.mediaList[0].url} alt="post" className="max-h-full max-w-full rounded-lg object-contain" />
                ) : (
                  // Modal - Text post content
                  <div className="max-h-full max-w-full p-6 text-center">
                    <p className="text-white text-lg leading-relaxed">
                      <RenderFormattedText text={selectedPost.content} onViewProfile={onViewProfile} />
                    </p>
                  </div>
                )}
              </div>
              
              {/* Modal - Details */}
              <div className="w-full md:w-80 p-4 bg-white dark:bg-slate-900 flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm overflow-hidden flex-shrink-0">
                    {selectedPost.profiles?.avatar_url ? (
                      <img src={selectedPost.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      (selectedPost.profiles?.username || 'U')[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-800 dark:text-white">
                      {selectedPost.profiles?.full_name || selectedPost.profiles?.username}
                    </p>
                    <p className="text-xs text-slate-400">@{selectedPost.profiles?.username}</p>
                  </div>
                </div>
                
                {selectedPost.content && (
                  <div className="flex-1 overflow-y-auto mb-3">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <RenderFormattedText text={selectedPost.content} onViewProfile={onViewProfile} />
                    </p>
                  </div>
                )}
                
                <div className="flex items-center gap-6 pt-3 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-4 h-4" />
                    <span>{selectedPost.likesCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4" />
                    <span>{selectedPost.commentsCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
