import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Search, Send, Loader2, MessageSquare, ArrowLeft, Image, 
  Check, CheckCheck, X, Download, Trash2, MoreVertical, Pin, PinOff, 
  Slash, RefreshCw, AlertCircle
} from 'lucide-react';

export default function Messages({ session }) {
  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // New Features States
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState(null);
  const [activeHoverMessage, setActiveHoverMessage] = useState(null);

  // 3-Dot Menu & Modals
  const [showMenu, setShowMenu] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  
  // Custom Modals (Replacing native browser popups)
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }

  // Block & Pin States
  const [iBlockedUser, setIBlockedUser] = useState(false);
  const [userBlockedMe, setUserBlockedMe] = useState(false);
  const [pinnedChats, setPinnedChats] = useState(() => {
    const saved = localStorage.getItem('auragram_pinned_chats');
    return saved ? JSON.parse(saved) : [];
  });

  const messagesEndRef = useRef(null);
  const presenceChannelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchRecentConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('auragram_pinned_chats', JSON.stringify(pinnedChats));
  }, [pinnedChats]);

  // Check Block Status whenever Active User changes
  useEffect(() => {
    if (activeUser && session?.user?.id) {
      checkBlockStatus();
    }
  }, [activeUser?.id, session?.user?.id]);

  async function checkBlockStatus() {
    if (!activeUser || !session?.user?.id) return;

    const { data } = await supabase
      .from('blocks')
      .select('*')
      .or(`and(blocker_id.eq.${session.user.id},blocked_id.eq.${activeUser.id}),and(blocker_id.eq.${activeUser.id},blocked_id.eq.${session.user.id})`);

    let iBlocked = false;
    let blockedMe = false;

    if (data) {
      data.forEach((b) => {
        if (b.blocker_id === session.user.id && b.blocked_id === activeUser.id) iBlocked = true;
        if (b.blocker_id === activeUser.id && b.blocked_id === session.user.id) blockedMe = true;
      });
    }

    setIBlockedUser(iBlocked);
    setUserBlockedMe(blockedMe);
  }

  // Format Date
  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // 1. TYPING INDICATOR VIA PRESENCE
  useEffect(() => {
    if (!activeUser || !session?.user?.id) return;

    const roomId = [session.user.id, activeUser.id].sort().join('_');
    const channel = supabase.channel(`typing_${roomId}`, {
      config: { presence: { key: session.user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const otherUserTyping = Object.keys(state).some(
          (key) => key === activeUser.id && state[key]?.[0]?.isTyping
        );
        setIsTyping(otherUserTyping);
      })
      .subscribe();

    presenceChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUser?.id, session?.user?.id]);

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({ isTyping: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        presenceChannelRef.current.track({ isTyping: false });
      }, 1500);
    }
  };

  // REALTIME MESSAGES & READ STATUS
  useEffect(() => {
    if (!activeUser || !session?.user?.id) return;

    fetchMessages(activeUser.id);
    markMessagesAsRead(activeUser.id);

    const channel = supabase
      .channel(`chat_room_${activeUser.id}_${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new;
            if (
              (newMsg.sender_id === session.user.id && newMsg.receiver_id === activeUser.id) ||
              (newMsg.sender_id === activeUser.id && newMsg.receiver_id === session.user.id)
            ) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });

              if (newMsg.receiver_id === session.user.id) {
                markMessagesAsRead(activeUser.id);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new;
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setMessages((prev) => prev.filter((m) => m.id !== deletedId));
          }

          fetchRecentConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUser?.id, session?.user?.id]);

  // Mark messages read
  async function markMessagesAsRead(otherUserId) {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', session.user.id)
      .eq('is_read', false);
  }

  // Search User in Inbox
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', session.user.id)
        .ilike('username', `%${searchQuery.trim()}%`)
        .limit(10);

      if (!error) {
        setSearchResults(data || []);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Conversations + Unread Count
  async function fetchRecentConversations() {
    setLoading(true);

    const { data: userMessages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false });

    if (error || !userMessages) {
      setLoading(false);
      return;
    }

    const conversationMap = new Map();
    const unreadMap = new Map();

    userMessages.forEach((msg) => {
      const otherId = msg.sender_id === session.user.id ? msg.receiver_id : msg.sender_id;
      if (!conversationMap.has(otherId)) {
        conversationMap.set(otherId, msg);
      }
      if (msg.receiver_id === session.user.id && !msg.is_read) {
        unreadMap.set(otherId, (unreadMap.get(otherId) || 0) + 1);
      }
    });

    const chattedUserIds = Array.from(conversationMap.keys());

    if (chattedUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', chattedUserIds);

      if (profiles) {
        const enrichedConversations = profiles.map((profile) => {
          const lastMsg = conversationMap.get(profile.id);
          return {
            ...profile,
            lastMessage: lastMsg?.content?.startsWith('[IMAGE]:') ? '📷 Photo' : lastMsg?.content,
            lastMessageTime: lastMsg?.created_at,
            unreadCount: unreadMap.get(profile.id) || 0,
          };
        });

        // Sort by Pinned First, then Time
        enrichedConversations.sort((a, b) => {
          const aPinned = pinnedChats.includes(a.id);
          const bPinned = pinnedChats.includes(b.id);
          if (aPinned && !bPinned) return -1;
          if (!aPinned && bPinned) return 1;
          return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
        });

        setConversations(enrichedConversations);
        if (enrichedConversations.length > 0 && !activeUser && window.innerWidth >= 768) {
          setActiveUser(enrichedConversations[0]);
        }
      }
    } else {
      setConversations([]);
    }

    setLoading(false);
  }

  // Fetch Messages History
  async function fetchMessages(otherUserId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${session.user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${session.user.id})`
      )
      .order('created_at', { ascending: true });

    if (!error) {
      setMessages(data || []);
    }
  }

  // Send Text Message
  async function handleSendMessage(e) {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !activeUser || sending || iBlockedUser || userBlockedMe) return;

    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);

    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({ isTyping: false });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          sender_id: session.user.id,
          receiver_id: activeUser.id,
          content: text,
        },
      ])
      .select();

    setSending(false);

    if (!error && data && data[0]) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data[0].id)) return prev;
        return [...prev, data[0]];
      });
      fetchRecentConversations();
    }
  }

  // Reactions
  const handleAddReaction = async (msgId, emoji) => {
    const targetMsg = messages.find((m) => m.id === msgId);
    if (!targetMsg) return;

    const currentReactions = targetMsg.reactions || {};
    const updatedReactions = { ...currentReactions, [session.user.id]: emoji };

    await supabase
      .from('messages')
      .update({ reactions: updatedReactions })
      .eq('id', msgId);

    setActiveHoverMessage(null);
  };

  // Delete Single Message Custom Modal
  const handleDeleteMessage = (msgId) => {
    setConfirmModal({
      title: 'Delete Message?',
      message: 'This message will be deleted for everyone in this chat.',
      confirmText: 'Delete',
      confirmBg: 'bg-red-600 hover:bg-red-700',
      onConfirm: async () => {
        await supabase.from('messages').delete().eq('id', msgId);
        setActiveHoverMessage(null);
      },
    });
  };

  // Clear Entire Chat Modal
  const handleClearChat = () => {
    setShowMenu(false);
    setConfirmModal({
      title: 'Clear entire chat?',
      message: `Are you sure you want to delete all messages with @${activeUser.username}? This cannot be undone.`,
      confirmText: 'Clear Chat',
      confirmBg: 'bg-red-600 hover:bg-red-700',
      onConfirm: async () => {
        await supabase
          .from('messages')
          .delete()
          .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${activeUser.id}),and(sender_id.eq.${activeUser.id},receiver_id.eq.${session.user.id})`);
        setMessages([]);
        fetchRecentConversations();
      },
    });
  };

  // Block / Unblock User Logic
  const handleToggleBlock = () => {
    setShowMenu(false);
    if (iBlockedUser) {
      // Unblock
      setConfirmModal({
        title: `Unblock @${activeUser.username}?`,
        message: 'They will be able to send you messages again.',
        confirmText: 'Unblock',
        confirmBg: 'bg-purple-600 hover:bg-purple-700',
        onConfirm: async () => {
          await supabase
            .from('blocks')
            .delete()
            .eq('blocker_id', session.user.id)
            .eq('blocked_id', activeUser.id);
          setIBlockedUser(false);
        },
      });
    } else {
      // Block
      setConfirmModal({
        title: `Block @${activeUser.username}?`,
        message: 'Blocked users cannot send you messages or view your updates.',
        confirmText: 'Block User',
        confirmBg: 'bg-red-600 hover:bg-red-700',
        onConfirm: async () => {
          await supabase
            .from('blocks')
            .insert([{ blocker_id: session.user.id, blocked_id: activeUser.id }]);
          setIBlockedUser(true);
        },
      });
    }
  };

  // Toggle Pin Chat
  const togglePinChat = (userId, e) => {
    e.stopPropagation();
    setPinnedChats((prev) => {
      const updated = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      return updated;
    });
  };

  // Image Upload Handler
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeUser || iBlockedUser || userBlockedMe) return;

    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `chat-media/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;

      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: session.user.id,
            receiver_id: activeUser.id,
            content: `[IMAGE]:${imageUrl}`,
          },
        ])
        .select();

      if (!error && data && data[0]) {
        setMessages((prev) => [...prev, data[0]]);
        fetchRecentConversations();
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      setConfirmModal({
        title: 'Upload Failed',
        message: 'Could not send image. Please check bucket public permissions.',
        confirmText: 'OK',
        hideCancel: true,
      });
    } finally {
      setUploadingImage(false);
    }
  };

  function handleSelectUser(user) {
    setActiveUser(user);
    setSearchQuery('');
    setSearchResults([]);
    setShowMenu(false);
    setShowChatSearch(false);
    setChatSearchQuery('');
  }

  // Filter messages based on in-chat search query
  const filteredMessages = chatSearchQuery.trim()
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(chatSearchQuery.toLowerCase().trim())
      )
    : messages;

  return (
    <div className="w-full h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 md:p-2 pb-14 md:pb-2 font-sans">
      <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-4">
        
        {/* ================= INBOX SIDEBAR ================= */}
        <div
          className={`md:col-span-4 lg:col-span-3 bg-white dark:bg-slate-900 md:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden min-h-0 ${
            activeUser ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Messages</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search username to chat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 text-xs pl-9 pr-3 py-2.5 rounded-2xl text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
            {searchQuery.trim() ? (
              searchResults.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 font-medium">No users found</p>
              ) : (
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="flex items-center space-x-3 p-3 rounded-2xl cursor-pointer hover:bg-purple-50 dark:hover:bg-slate-800/60 transition"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden flex-shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        (user.full_name || user.username || 'U')[0].toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        @{user.username}
                      </p>
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium truncate">
                        Tap to start message
                      </p>
                    </div>
                  </div>
                ))
              )
            ) : loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-1">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No recent chats</p>
                <p className="text-[11px] text-slate-400">Search a username above to start messaging!</p>
              </div>
            ) : (
              conversations.map((user) => {
                const isActive = activeUser?.id === user.id;
                const isPinned = pinnedChats.includes(user.id);

                return (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`group relative flex items-center space-x-3 p-3 rounded-2xl cursor-pointer transition ${
                      isActive
                        ? 'bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden flex-shrink-0 relative">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        (user.full_name || user.username || 'U')[0].toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-baseline">
                        <div className="flex items-center gap-1 min-w-0">
                          <p
                            className={`text-xs font-bold truncate ${
                              isActive ? 'text-purple-700 dark:text-purple-300' : 'text-slate-800 dark:text-white'
                            }`}
                          >
                            @{user.username || 'user'}
                          </p>
                          {isPinned && <Pin className="w-3 h-3 text-purple-500 fill-purple-500 flex-shrink-0 rotate-45" />}
                        </div>

                        {user.lastMessageTime && (
                          <span className="text-[9px] text-slate-400 flex-shrink-0">
                            {new Date(user.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-0.5">
                        <p className="text-[10px] text-slate-400 truncate max-w-[80%]">
                          {user.lastMessage || 'Tap to open messages'}
                        </p>
                        {user.unreadCount > 0 && (
                          <span className="bg-purple-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                            {user.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pin/Unpin Action Button on Hover */}
                    <button
                      onClick={(e) => togglePinChat(user.id, e)}
                      title={isPinned ? 'Unpin Chat' : 'Pin Chat'}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition text-slate-400 hover:text-purple-600"
                    >
                      {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= CHAT WINDOW ================= */}
        <div
          className={`md:col-span-8 lg:col-span-9 bg-white dark:bg-slate-900 md:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden min-h-0 relative ${
            !activeUser ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeUser ? (
            <>
              {/* HEADER */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-20 relative">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setActiveUser(null)}
                    className="md:hidden text-slate-600 dark:text-slate-300 hover:text-purple-600 mr-1 p-1"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden flex-shrink-0">
                    {activeUser.avatar_url ? (
                      <img src={activeUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      (activeUser.full_name || activeUser.username || 'U')[0].toUpperCase()
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-extrabold text-slate-800 dark:text-white">
                      @{activeUser.username || 'user'}
                    </h3>
                    {iBlockedUser ? (
                      <span className="text-[10px] text-red-500 font-bold">You blocked this user</span>
                    ) : userBlockedMe ? (
                      <span className="text-[10px] text-slate-400 font-semibold">User unavailable</span>
                    ) : isTyping ? (
                      <span className="text-[10px] text-purple-600 font-bold animate-pulse flex items-center gap-1">
                        typing...
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                      </span>
                    )}
                  </div>
                </div>

                {/* 3-DOTS HEADER MENU */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 top-11 w-48 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl py-2 z-30 space-y-1">
                      <button
                        onClick={() => {
                          setShowChatSearch(!showChatSearch);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-slate-700/60 flex items-center gap-2"
                      >
                        <Search className="w-4 h-4 text-purple-500" /> Search in Chat
                      </button>

                      <button
                        onClick={handleClearChat}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-slate-700/60 flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4 text-amber-500" /> Clear Chat
                      </button>

                      <button
                        onClick={handleToggleBlock}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700/60"
                      >
                        <Slash className="w-4 h-4" /> {iBlockedUser ? 'Unblock User' : 'Block User'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* IN-CHAT SEARCH BAR */}
              {showChatSearch && (
                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between z-10">
                  <div className="relative flex-1 mr-2">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search keywords in this conversation..."
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setShowChatSearch(false);
                      setChatSearchQuery('');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* MESSAGES FEED */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-20 space-y-2">
                    <MessageSquare className="w-8 h-8 text-purple-300 dark:text-purple-800 mx-auto" />
                    <p className="text-xs font-semibold text-slate-400">
                      {chatSearchQuery
                        ? 'No messages found for this search.'
                        : `Say hi to @${activeUser.username}!`}
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((msg, index) => {
                    const isMe = msg.sender_id === session.user.id;
                    const currentDateStr = new Date(msg.created_at).toDateString();
                    const prevDateStr = index > 0 ? new Date(filteredMessages[index - 1].created_at).toDateString() : null;
                    const showDateHeader = currentDateStr !== prevDateStr;

                    const isImage = msg.content?.startsWith('[IMAGE]:');
                    const imageUrl = isImage ? msg.content.replace('[IMAGE]:', '') : null;
                    const reactionsList = Object.values(msg.reactions || {});

                    return (
                      <React.Fragment key={msg.id || index}>
                        {showDateHeader && (
                          <div className="flex justify-center my-3">
                            <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full uppercase tracking-wider">
                              {formatDateHeader(msg.created_at)}
                            </span>
                          </div>
                        )}

                        <div
                          className={`relative group flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          onMouseEnter={() => setActiveHoverMessage(msg.id)}
                          onMouseLeave={() => setActiveHoverMessage(null)}
                        >
                          {/* Hover Menu Options (Reactions & Delete) */}
                          {activeHoverMessage === msg.id && !iBlockedUser && !userBlockedMe && (
                            <div
                              className={`absolute -top-7 ${
                                isMe ? 'right-0' : 'left-0'
                              } bg-white dark:bg-slate-800 shadow-md rounded-full px-2 py-1 flex items-center space-x-1 border border-slate-200 dark:border-slate-700 z-20`}
                            >
                              {['❤️', '😂', '👍', '🔥'].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleAddReaction(msg.id, emoji)}
                                  className="text-xs hover:scale-125 transition transform"
                                >
                                  {emoji}
                                </button>
                              ))}
                              {isMe && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="text-red-500 hover:text-red-600 pl-1 border-l border-slate-200 dark:border-slate-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}

                          <div
                            className={`relative max-w-[80%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl text-xs font-semibold space-y-1 ${
                              isMe
                                ? 'bg-purple-600 text-white rounded-br-none shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-bl-none shadow-2xs'
                            }`}
                          >
                            {isImage ? (
                              <img
                                src={imageUrl}
                                alt="attachment"
                                onClick={() => setSelectedImageModal(imageUrl)}
                                className="rounded-lg max-h-60 w-full object-cover my-1 cursor-pointer hover:opacity-95 transition"
                              />
                            ) : (
                              <p className="leading-relaxed">{msg.content}</p>
                            )}

                            <div className="flex items-center justify-end space-x-1">
                              <span className={`text-[9px] ${isMe ? 'text-purple-200' : 'text-slate-400'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>

                              {/* Read Receipts Checkmarks */}
                              {isMe && (
                                <span>
                                  {msg.is_read ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                                  ) : (
                                    <Check className="w-3 h-3 text-purple-200" />
                                  )}
                                </span>
                              )}
                            </div>

                            {/* Applied Reactions Badge */}
                            {reactionsList.length > 0 && (
                              <div
                                className={`absolute -bottom-2 ${
                                  isMe ? 'left-2' : 'right-2'
                                } bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-1.5 py-0.5 text-[10px] shadow-sm flex items-center`}
                              >
                                {reactionsList.join('')}
                              </div>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT BAR / BLOCK WARNING BANNER */}
              {iBlockedUser ? (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-red-50 dark:bg-red-950/20 text-center flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">
                    You have blocked @{activeUser.username}. Unblock to send messages.
                  </p>
                  <button
                    onClick={handleToggleBlock}
                    className="ml-2 text-xs font-bold underline text-purple-600 dark:text-purple-400"
                  >
                    Unblock
                  </button>
                </div>
              ) : userBlockedMe ? (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-center flex items-center justify-center gap-2">
                  <Slash className="w-4 h-4 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    You cannot reply to this conversation. @{activeUser.username} has blocked you.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 pb-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center space-x-2"
                >
                  <label className="p-2 text-slate-400 hover:text-purple-600 cursor-pointer rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    <Image className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>

                  <input
                    type="text"
                    placeholder={uploadingImage ? 'Uploading image...' : `Message @${activeUser.username}...`}
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    disabled={uploadingImage}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full px-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 placeholder-slate-400"
                  />

                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending || uploadingImage}
                    className="bg-purple-600 hover:bg-purple-700 text-white p-2.5 rounded-full transition disabled:opacity-50 shadow-md shadow-purple-500/20 flex-shrink-0 flex items-center justify-center"
                  >
                    {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-slate-400 p-6 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-semibold">Select or search a user from the left inbox to start chatting!</p>
            </div>
          )}
        </div>
      </div>

      {/* FULL-SCREEN IMAGE LIGHTBOX MODAL */}
      {selectedImageModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <button
            onClick={() => setSelectedImageModal(null)}
            className="absolute top-5 right-5 text-white bg-slate-800/80 p-2 rounded-full hover:bg-slate-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <a
            href={selectedImageModal}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="absolute top-5 right-18 text-white bg-slate-800/80 p-2 rounded-full hover:bg-slate-700 transition"
          >
            <Download className="w-6 h-6" />
          </a>
          <img
            src={selectedImageModal}
            alt="full preview"
            className="max-w-full max-h-[85vh] rounded-2xl object-contain"
          />
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL (Replaces Native Browser Alerts) */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
              {confirmModal.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              {!confirmModal.hideCancel && (
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-md ${
                  confirmModal.confirmBg || 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}