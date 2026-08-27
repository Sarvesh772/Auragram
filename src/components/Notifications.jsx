import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, MessageCircle, UserPlus, CheckCheck, Loader2, Bell, X, Sparkles } from 'lucide-react';
import { RenderFormattedText } from './MentionInput';

export default function Notifications({ session, onViewProfile }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotif, setSelectedNotif] = useState(null);

  const notificationText = (type) => ({
    like: 'liked your post.',
    comment: 'commented on your post.',
    reply: 'replied to your comment.',
    follow: 'started following you.',
    followback: 'followed you back.',
    mention: 'mentioned you in a post or comment.'
  }[type] || 'interacted with your content.');

  useEffect(() => {
    let channel;

    if (session?.user?.id) {
      fetchNotifications();

      channel = supabase
        .channel(`user_notifs_${session.user.id}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${session.user.id}`
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  async function fetchNotifications() {
    setLoading(true);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error || !data) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    if (data.length > 0) {
      const actorIds = [...new Set(data.map(n => n.actor_id))];
      const postIds = [...new Set(data.filter(n => n.post_id).map(n => n.post_id))];

      const [profilesRes, postsRes] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url').in('id', actorIds),
        postIds.length > 0 ? supabase.from('posts').select('*').in('id', postIds) : { data: [] }
      ]);

      const actorsMap = (profilesRes.data || []).reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {});
      const postsMap = (postsRes.data || []).reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {});

      const commentNotifs = data.filter(n => (n.type === 'comment' || n.type === 'mention') && n.post_id);
      let commentsMap = {};

      if (commentNotifs.length > 0) {
        const { data: commentsData } = await supabase
          .from('comments')
          .select('*')
          .in('post_id', postIds)
          .order('created_at', { ascending: false });

        commentsMap = (commentsData || []).reduce((acc, curr) => {
          if (!acc[curr.post_id]) acc[curr.post_id] = [];
          acc[curr.post_id].push(curr);
          return acc;
        }, {});
      }

      const formatted = data.map(n => {
        const post = postsMap[n.post_id] || null;
        const postComments = commentsMap[n.post_id] || [];
        const latestComment = postComments.find(c => c.user_id === n.actor_id) || postComments[0];

        return {
          ...n,
          actor: actorsMap[n.actor_id] || { username: 'Someone', avatar_url: null },
          post: post,
          comment_text: latestComment?.content || null
        };
      });

      setNotifications(formatted);
    } else {
      setNotifications([]);
    }

    setLoading(false);
  }

  async function handleNotificationClick(notif) {
    setSelectedNotif(notif);

    if (!notif.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
  }

  async function handleMarkAllAsRead() {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  }

  const renderNotifIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-3.5 h-3.5 fill-purple-500 text-purple-500" />;
      case 'follow':
        return <UserPlus className="w-3.5 h-3.5 text-blue-500" />;
      case 'mention':
        return <Sparkles className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-black text-slate-800 dark:text-white">Notifications</h2>
          {unreadCount > 0 && (
            <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center space-x-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 transition"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-300 rounded-full flex items-center justify-center mx-auto">
            <Bell className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-400">No notifications yet!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`flex items-start justify-between p-4 rounded-2xl border cursor-pointer transition hover:border-purple-300 dark:hover:border-slate-700 hover:shadow-md ${
                notif.is_read 
                  ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800' 
                  : 'bg-purple-50/40 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/50 shadow-xs'
              }`}
            >
              <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                <div className="relative flex-shrink-0 mt-0.5">
                  <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden">
                    {notif.actor?.avatar_url ? (
                      <img src={notif.actor.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      (notif.actor?.username || 'U')[0].toUpperCase()
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 p-1 rounded-full shadow-sm">
                    {renderNotifIcon(notif.type)}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
                    <span className="font-extrabold text-slate-900 dark:text-white">@{notif.actor?.username || 'user'}</span>{' '}
                    {notificationText(notif.type)}
                  </p>

                  {/* Comment/Mention Text Preview */}
                  {notif.comment_text && (notif.type === 'comment' || notif.type === 'reply' || notif.type === 'mention') && (
                    <div className="mt-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 italic truncate max-w-sm">
                      <RenderFormattedText text={`"${notif.comment_text}"`} onViewProfile={onViewProfile} />
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {notif.post?.media_url && (
                <div className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 flex-shrink-0 ml-3 bg-black/5">
                  {notif.post.media_type === 'video' ? (
                    <video src={notif.post.media_url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={notif.post.media_url} alt="post" className="w-full h-full object-cover" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CLICK POPUP MODAL */}
      {selectedNotif && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setSelectedNotif(null)} 
              className="absolute top-4 right-4 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden">
                {selectedNotif.actor?.avatar_url ? (
                  <img src={selectedNotif.actor.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  (selectedNotif.actor?.username || 'U')[0].toUpperCase()
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">@{selectedNotif.actor?.username}</p>
                <p className="text-xs text-slate-400">
                  {selectedNotif.type === 'comment' && 'Commented on your post'}
                  {selectedNotif.type === 'like' && 'Liked your post'}
                  {selectedNotif.type === 'follow' && 'Started following you'}
                  {selectedNotif.type === 'mention' && 'Mentioned you'}
                </p>
              </div>
            </div>

            {(selectedNotif.type === 'comment' || selectedNotif.type === 'mention') && selectedNotif.comment_text && (
              <div className="bg-purple-50/60 dark:bg-slate-800 p-3.5 rounded-2xl border border-purple-100 dark:border-slate-700">
                <p className="text-xs font-semibold text-purple-900 dark:text-purple-300 uppercase tracking-wider mb-1">
                  {selectedNotif.type === 'mention' ? 'Mention Context:' : 'Comment:'}
                </p>
                <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                  <RenderFormattedText text={selectedNotif.comment_text} onViewProfile={onViewProfile} />
                </p>
              </div>
            )}

            {selectedNotif.post && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Post:</p>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                  {selectedNotif.post.content && (
                    <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                      <RenderFormattedText text={selectedNotif.post.content} onViewProfile={onViewProfile} />
                    </p>
                  )}
                  {selectedNotif.post.media_url && (
                    <div className="rounded-xl overflow-hidden max-h-52 bg-black/5">
                      {selectedNotif.post.media_type === 'video' ? (
                        <video src={selectedNotif.post.media_url} playsInline muted className="w-full max-h-52 object-contain" />
                      ) : (
                        <img src={selectedNotif.post.media_url} alt="post media" className="w-full max-h-52 object-contain" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
