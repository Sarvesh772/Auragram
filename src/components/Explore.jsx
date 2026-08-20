import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Hash, User, Grid, Heart, MessageCircle, TrendingUp } from 'lucide-react';
import { RenderFormattedText } from './MentionInput';

export default function Explore({ session, onViewProfile }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'users', 'hashtags', 'posts'
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExploreData();
  }, []);

  async function fetchExploreData() {
    setLoading(true);

    // Fetch Users
    const { data: usersData } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio')
      .neq('id', session.user.id)
      .limit(20);

    // Fetch Posts
    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (postsData) {
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const postIds = postsData.map(p => p.id);

      const [profilesRes, likesRes, commentsRes] = await Promise.all([
        supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds),
        supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
        supabase.from('comments').select('id, post_id').in('post_id', postIds)
      ]);

      const profilesMap = (profilesRes.data || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

      const formattedPosts = postsData.map(post => {
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

      // Extract Trending Hashtags from posts content
      const tagCounts = {};
      postsData.forEach(p => {
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

    setUsers(usersData || []);
    setLoading(false);
  }

  // Filtered Logic
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

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto pb-24">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search accounts, #hashtags, posts..."
          className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600/50"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
            activeFilter === 'all'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          Top
        </button>
        <button
          onClick={() => setActiveFilter('users')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1.5 transition ${
            activeFilter === 'users'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Accounts</span>
        </button>
        <button
          onClick={() => setActiveFilter('hashtags')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1.5 transition ${
            activeFilter === 'hashtags'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
          <span>Hashtags</span>
        </button>
        <button
          onClick={() => setActiveFilter('posts')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1.5 transition ${
            activeFilter === 'posts'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Posts</span>
        </button>
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-10 text-sm font-medium">Loading explore...</p>
      ) : (
        <div className="space-y-6">
          
          {/* HASHTAGS SECTION */}
          {(activeFilter === 'all' || activeFilter === 'hashtags') && filteredTags.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-slate-800 dark:text-white font-bold text-sm">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span>Trending Hashtags</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {filteredTags.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSearchQuery(t.tag)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition text-left border border-slate-100 dark:border-slate-800"
                  >
                    <div>
                      <p className="font-bold text-xs text-purple-600 dark:text-purple-400">{t.tag}</p>
                      <p className="text-[10px] text-slate-400">{t.count} {t.count === 1 ? 'post' : 'posts'}</p>
                    </div>
                    <Hash className="w-4 h-4 text-slate-300" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ACCOUNTS SECTION */}
          {(activeFilter === 'all' || activeFilter === 'users') && filteredUsers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Accounts</h3>
              <div className="space-y-2">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => onViewProfile?.(user.id)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-purple-300 cursor-pointer transition shadow-2xs"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm overflow-hidden flex-shrink-0">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          (user.username || 'U')[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800 dark:text-white">@{user.username}</p>
                        <p className="text-xs text-slate-400">{user.full_name || 'Auragram Member'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* POSTS GRID SECTION */}
          {(activeFilter === 'all' || activeFilter === 'posts') && filteredPosts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Posts</h3>
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden">
                {filteredPosts.map(post => {
                  const media = post.mediaList?.[0];
                  return (
                    <div
                      key={post.id}
                      className="relative aspect-square bg-slate-100 dark:bg-slate-800 group overflow-hidden cursor-pointer"
                    >
                      {media ? (
                        media.type === 'video' ? (
                          <video src={media.url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={media.url} alt="post" className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="p-3 w-full h-full bg-purple-50 dark:bg-slate-800 flex items-center justify-center text-center">
                          <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 line-clamp-3">
                            <RenderFormattedText text={post.content} onViewProfile={onViewProfile} />
                          </p>
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-3 text-white">
                        <div className="flex items-center space-x-1 text-xs font-bold">
                          <Heart className="w-4 h-4 fill-white" />
                          <span>{post.likesCount}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs font-bold">
                          <MessageCircle className="w-4 h-4 fill-white" />
                          <span>{post.commentsCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* NO RESULTS FOUND */}
          {filteredUsers.length === 0 && filteredPosts.length === 0 && filteredTags.length === 0 && (
            <p className="text-center text-slate-400 py-12 text-xs font-semibold">
              No results found for "{searchQuery}"
            </p>
          )}

        </div>
      )}
    </div>
  );
}