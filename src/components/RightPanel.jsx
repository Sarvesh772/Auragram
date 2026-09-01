import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';

export default function RightPanel({ session, onViewProfile, onSeeAll }) {
  const [suggestions, setSuggestions] = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchSuggestionsAndFollows();
    }
  }, [session]);

  async function fetchSuggestionsAndFollows() {
    setLoading(true);
    const currentUserId = session.user.id;

    try {
      // 1. Fetch current user's existing follows
      const { data: myFollows, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);

      if (followsError) throw followsError;

      const followedSet = new Set((myFollows || []).map(f => f.following_id));
      setFollowingIds(followedSet);

      // 2. Fetch profiles excluding current user
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId)
        .limit(10);

      if (profilesError) throw profilesError;

      setSuggestions(profiles || []);
    } catch (error) {
      console.error('Error fetching right panel data:', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleFollow(targetUserId) {
    const currentUserId = session.user.id;
    const isCurrentlyFollowing = followingIds.has(targetUserId);

    // Optimistic UI Update
    setFollowingIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyFollowing) {
        next.delete(targetUserId);
      } else {
        next.add(targetUserId);
      }
      return next;
    });

    try {
      if (isCurrentlyFollowing) {
        // Unfollow DB Call
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId);

        if (error) throw error;
      } else {
        // Follow DB Call
        const { error } = await supabase
          .from('follows')
          .insert([{ follower_id: currentUserId, following_id: targetUserId }]);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating follow status:', error.message);
      // Revert Optimistic Update on error
      setFollowingIds(prev => {
        const next = new Set(prev);
        if (isCurrentlyFollowing) {
          next.add(targetUserId);
        } else {
          next.delete(targetUserId);
        }
        return next;
      });
    }
  }

  return (
    <div className="w-80 p-4 space-y-4">
      {/* Suggestions Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
            Suggested for you
          </h3>
          <button onClick={onSeeAll} className="text-[11px] font-bold text-purple-600 dark:text-purple-400 cursor-pointer hover:underline">
            See All
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No suggestions available</p>
        ) : (
          <div className="space-y-3.5">
            {suggestions.map((user) => {
              const isFollowing = followingIds.has(user.id);

              return (
                <div key={user.id} className="flex items-center justify-between">
                  {/* User Profile Info */}
                  <button onClick={() => onViewProfile?.(user.username || user.id)} className="flex items-center space-x-3 overflow-hidden text-left">
                    <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden flex-shrink-0">
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt="avatar" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        (user.username || 'U')[0].toUpperCase()
                      )}
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {user.full_name || user.username || 'User'}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        @{user.username || 'username'}
                      </p>
                    </div>
                  </button>

                  {/* Follow / Unfollow Button */}
                  <button
                    onClick={() => handleToggleFollow(user.id)}
                    className={`ml-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1 flex-shrink-0 ${
                      isFollowing
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-500/20'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
