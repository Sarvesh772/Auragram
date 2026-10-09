/** Count only relationships whose other account still has a profile row. */
export async function getActiveFollowStats(supabase, userId) {
  if (!userId) return { followers: 0, following: 0 };

  const [followersResult, followingResult] = await Promise.all([
    supabase.from('follows').select('follower_id').eq('following_id', userId),
    supabase.from('follows').select('following_id').eq('follower_id', userId),
  ]);
  const followerIds = [...new Set((followersResult.data || []).map((row) => row.follower_id).filter(Boolean))];
  const followingIds = [...new Set((followingResult.data || []).map((row) => row.following_id).filter(Boolean))];

  const [followerProfiles, followingProfiles] = await Promise.all([
    followerIds.length ? supabase.from('profiles').select('id').in('id', followerIds) : Promise.resolve({ data: [] }),
    followingIds.length ? supabase.from('profiles').select('id').in('id', followingIds) : Promise.resolve({ data: [] }),
  ]);
  return {
    followers: new Set((followerProfiles.data || []).map((profile) => profile.id)).size,
    following: new Set((followingProfiles.data || []).map((profile) => profile.id)).size,
  };
}
