import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Search, Send, Loader2, MessageSquare, ArrowLeft, Image as ImageIcon, 
  Check, CheckCheck, X, Download, Trash2, MoreVertical, Pin, PinOff, 
  Slash, RefreshCw, AlertCircle, Reply, ChevronLeft, ChevronRight,
  Paperclip, FileText, ExternalLink, SmilePlus
} from 'lucide-react';

export default function Messages({ session, onViewProfile }) {
  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Active Status & Typing States
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  // Lightbox & Carousel States
  const [galleryImages, setGalleryImages] = useState([]);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  // Reply State
  const [replyToMessage, setReplyToMessage] = useState(null);

  // Swipe gesture tracking
  const [dragMsgId, setDragMsgId] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartX = useRef(0);

  // Hover & UI
  const [activeHoverMessage, setActiveHoverMessage] = useState(null);

  // 3-Dot Menu & Search
  const [showMenu, setShowMenu] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  
  // Custom Modals
  const [confirmModal, setConfirmModal] = useState(null);
  

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

  const getDisplayName = (user) => {
    if (!user) return 'User';
    return user.full_name || user.username || 'User';
  };

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

  // Check Block Status & Last Seen
  useEffect(() => {
    if (activeUser && session?.user?.id) {
      checkBlockStatus();
      if (activeUser.last_seen) {
        setLastSeen(activeUser.last_seen);
      }
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

  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Offline';
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return `Last seen today at ${timeStr}`;
    }
    return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
  };

  // Realtime Presence
  useEffect(() => {
    if (!activeUser || !session?.user?.id) return;

    setIsOnline(false);
    setIsTyping(false);

    const roomId = [session.user.id, activeUser.id].sort().join('_');
    const channel = supabase.channel(`presence_${roomId}`, {
      config: { presence: { key: session.user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activePresenceKeys = Object.keys(state);
        
        const isUserActiveInRoom = activePresenceKeys.some(key => key === activeUser.id);
        setIsOnline(isUserActiveInRoom);

        if (isUserActiveInRoom && state[activeUser.id]?.[0]) {
          const userState = state[activeUser.id][0];
          setIsTyping(Boolean(userState.isTyping));
        } else {
          setIsTyping(false);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key === activeUser.id) {
          setIsOnline(false);
          setIsTyping(false);
          const nowStr = new Date().toISOString();
          setLastSeen(nowStr);

          supabase
            .from('profiles')
            .update({ last_seen: nowStr })
            .eq('id', activeUser.id);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            isTyping: false
          });
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeUser?.id, session?.user?.id]);

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({
        online_at: new Date().toISOString(),
        isTyping: true
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        presenceChannelRef.current.track({
          online_at: new Date().toISOString(),
          isTyping: false
        });
      }, 1500);
    }
  };

  // Realtime Messages
  useEffect(() => {
    if (!activeUser || !session?.user?.id) return;

    fetchMessages(activeUser.id);
    markMessagesAsRead(activeUser.id);

    const channel = supabase
      .channel(`chat_room_${activeUser.id}_${session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
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

  async function markMessagesAsRead(otherUserId) {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', session.user.id)
      .eq('is_read', false);
  }

  // Search Users
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
        .or(`username.ilike.%${searchQuery.trim()}%,full_name.ilike.%${searchQuery.trim()}%`)
        .limit(10);

      if (!error) {
        setSearchResults(data || []);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
          let preview = lastMsg?.content;
          if (preview?.startsWith('[IMAGES]:') || preview?.startsWith('[IMAGE]:')) {
            preview = '📷 Photo';
          }
          return {
            ...profile,
            lastMessage: preview,
            lastMessageTime: lastMsg?.created_at,
            unreadCount: unreadMap.get(profile.id) || 0,
          };
        });

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

  // Send Message with Reply Support
  async function handleSendMessage(e) {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !activeUser || sending || iBlockedUser || userBlockedMe) return;

    const text = newMessage.trim();
    // Change: sender_name me hardcoded 'You' ki jagah sender_id save kar rahe hain
    const replyData = replyToMessage
      ? {
          id: replyToMessage.id,
          sender_id: replyToMessage.sender_id,
          content: replyToMessage.content,
        }
      : null;

    setNewMessage('');
    setReplyToMessage(null);
    setSending(true);

    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({
        online_at: new Date().toISOString(),
        isTyping: false
      });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          sender_id: session.user.id,
          receiver_id: activeUser.id,
          content: text,
          reply_to: replyData,
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

  // Handle Multiple Images Upload (Grid & Carousel support)
  const handleMultipleImagesUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !activeUser || iBlockedUser || userBlockedMe) return;

    try {
      setUploadingImage(true);
      const uploadedUrls = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const filePath = `chat-media/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrlData.publicUrl);
      }

      const formattedContent = `[IMAGES]:${JSON.stringify(uploadedUrls)}`;

      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: session.user.id,
            receiver_id: activeUser.id,
            content: formattedContent,
           reply_to: replyToMessage
              ? {
                  id: replyToMessage.id,
                  sender_id: replyToMessage.sender_id,
                  content: replyToMessage.content,
                }
              : null,
          },
        ])
        .select();

      setReplyToMessage(null);

      if (!error && data && data[0]) {
        setMessages((prev) => [...prev, data[0]]);
        fetchRecentConversations();
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      setConfirmModal({
        title: 'Upload Failed',
        message: 'Could not send images. Please verify storage bucket permissions.',
        confirmText: 'OK',
        hideCancel: true,
      });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  // Reactions & Modals
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

  const handleClearChat = () => {
    setShowMenu(false);
    setConfirmModal({
      title: 'Clear entire chat?',
      message: `Are you sure you want to delete all messages with ${getDisplayName(activeUser)}? This cannot be undone.`,
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

  const handleToggleBlock = () => {
    setShowMenu(false);
    if (iBlockedUser) {
      setConfirmModal({
        title: `Unblock ${getDisplayName(activeUser)}?`,
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
      setConfirmModal({
        title: `Block ${getDisplayName(activeUser)}?`,
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

  const togglePinChat = (userId, e) => {
    e.stopPropagation();
    setPinnedChats((prev) => {
      const updated = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      return updated;
    });
  };

  function handleSelectUser(user) {
    setActiveUser(user);
    setSearchQuery('');
    setSearchResults([]);
    setShowMenu(false);
    setShowChatSearch(false);
    setChatSearchQuery('');
    setReplyToMessage(null);
  }

  // SWIPE TO REPLY HANDLERS
  const handleTouchStart = (e, msgId) => {
    dragStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
    setDragMsgId(msgId);
  };

  const handleTouchMove = (e, msg) => {
    if (dragMsgId !== msg.id) return;
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const deltaX = currentX - dragStartX.current;
    const isMe = msg.sender_id === session.user.id;

    // Others: Pull Left (negative delta) | Mine: Pull Right (positive delta)
    if (!isMe && deltaX < 0) {
      setDragOffset(Math.max(deltaX, -80));
    } else if (isMe && deltaX > 0) {
      setDragOffset(Math.min(deltaX, 80));
    }
  };

  const handleTouchEnd = (msg) => {
    if (dragMsgId === msg.id) {
      if (Math.abs(dragOffset) > 50) {
        setReplyToMessage(msg);
      }
    }
    setDragMsgId(null);
    setDragOffset(0);
  };

  // Helper parser for image URLs
  const parseImageUrls = (content) => {
    if (!content) return [];
    if (content.startsWith('[IMAGES]:')) {
      try {
        return JSON.parse(content.replace('[IMAGES]:', ''));
      } catch {
        return [];
      }
    }
    if (content.startsWith('[IMAGE]:')) {
      return [content.replace('[IMAGE]:', '')];
    }
    return [];
  };

  const openGallery = (urls, index) => {
    setGalleryImages(urls);
    setActiveGalleryIndex(index);
  };

  const filteredMessages = chatSearchQuery.trim()
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(chatSearchQuery.toLowerCase().trim())
      )
    : messages;

  return (
    <div className="w-full h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 md:p-2 pb-14 md:pb-2 font-sans select-none">
      <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-4">
        
        {/* INBOX SIDEBAR */}
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
                placeholder="Search display name or username..."
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
                        getDisplayName(user)[0].toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {getDisplayName(user)}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        @{user.username}
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
                <p className="text-[11px] text-slate-400">Search someone above to start chatting!</p>
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
                        getDisplayName(user)[0].toUpperCase()
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
                            {getDisplayName(user)}
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
                          {user.lastMessage || 'Tap to open chat'}
                        </p>
                        {user.unreadCount > 0 && (
                          <span className="bg-purple-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                            {user.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>

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

        {/* CHAT WINDOW */}
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

                  <div className="relative">
                    <button onClick={() => onViewProfile?.(activeUser.id)} className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden flex-shrink-0">
                      {activeUser.avatar_url ? (
                        <img src={activeUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        getDisplayName(activeUser)[0].toUpperCase()
                      )}
                    </button>
                    {isOnline && !iBlockedUser && !userBlockedMe && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-extrabold text-slate-800 dark:text-white">
                      {getDisplayName(activeUser)}
                    </h3>
                    {iBlockedUser ? (
                      <span className="text-[10px] text-red-500 font-bold">You blocked this user</span>
                    ) : userBlockedMe ? (
                      <span className="text-[10px] text-slate-400 font-semibold">User unavailable</span>
                    ) : isTyping ? (
                      <span className="text-[10px] text-purple-600 font-bold animate-pulse flex items-center gap-1">
                        typing...
                      </span>
                    ) : isOnline ? (
                      <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active Now
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatLastSeen(lastSeen)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3-DOTS MENU */}
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
                      placeholder="Search messages..."
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

              {/* MESSAGES FEED WITH SWIPE TO REPLY */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-20 space-y-2">
                    <MessageSquare className="w-8 h-8 text-purple-300 dark:text-purple-800 mx-auto" />
                    <p className="text-xs font-semibold text-slate-400">
                      {chatSearchQuery
                        ? 'No messages found.'
                        : `Say hi to ${getDisplayName(activeUser)}!`}
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((msg, index) => {
                    const isMe = msg.sender_id === session.user.id;
                    const currentDateStr = new Date(msg.created_at).toDateString();
                    const prevDateStr = index > 0 ? new Date(filteredMessages[index - 1].created_at).toDateString() : null;
                    const showDateHeader = currentDateStr !== prevDateStr;

                    const imageUrls = parseImageUrls(msg.content);
                    const isImageMsg = imageUrls.length > 0;
                    const reactionsList = Object.values(msg.reactions || {});

                    const currentOffset = dragMsgId === msg.id ? dragOffset : 0;

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
                          className={`relative group flex ${isMe ? 'justify-end' : 'justify-start'} touch-pan-y`}
                          onMouseEnter={() => setActiveHoverMessage(msg.id)}
                          onMouseLeave={() => setActiveHoverMessage(null)}
                          onTouchStart={(e) => handleTouchStart(e, msg.id)}
                          onTouchMove={(e) => handleTouchMove(e, msg)}
                          onTouchEnd={() => handleTouchEnd(msg)}
                          onMouseDown={(e) => handleTouchStart(e, msg.id)}
                          onMouseMove={(e) => handleTouchMove(e, msg)}
                          onMouseUp={() => handleTouchEnd(msg)}
                        >
                          {/* Swipe Reply Indicator Icon */}
                          {dragMsgId === msg.id && Math.abs(currentOffset) > 15 && (
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 p-2 bg-purple-600 text-white rounded-full transition ${
                                isMe ? 'right-2' : 'left-2'
                              }`}
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </div>
                          )}

                          {/* Hover Actions Bar */}
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
                              <button
                                onClick={() => setReplyToMessage(msg)}
                                className="text-slate-500 hover:text-purple-600 px-1"
                                title="Reply"
                              >
                                <Reply className="w-3 h-3" />
                              </button>
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

                          {/* Message Bubble Container with Smooth Drag Shift */}
                          <div
                            style={{ transform: `translateX(${currentOffset}px)` }}
                            className={`relative max-w-[80%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl text-xs font-semibold space-y-1 transition-transform ease-out ${
                              isMe
                                ? 'bg-purple-600 text-white rounded-br-none shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-bl-none shadow-2xs'
                            }`}
                          >
                            {/* Replying Context Header inside Message */}
                            {msg.reply_to && (
                              <div
                                className={`p-2 rounded-lg text-[10px] mb-1.5 border-l-2 ${
                                  isMe
                                    ? 'bg-purple-700/60 border-white/80 text-purple-100'
                                    : 'bg-slate-100 dark:bg-slate-700 border-purple-500 text-slate-600 dark:text-slate-300'
                                }`}
                              >
<p className="font-bold opacity-90">{msg.reply_to.sender_id ? (msg.reply_to.sender_id === session.user.id ? 'You' : getDisplayName(activeUser)) : (msg.reply_to.sender_name === 'You'
        ? (msg.sender_id === session.user.id ? 'You' : getDisplayName(activeUser)) : (msg.reply_to.sender_name || 'User'))}</p>
<p className="truncate opacity-80 font-normal">{msg.reply_to.content?.startsWith('[IMAGES]:') || msg.reply_to.content?.startsWith('[IMAGE]:') ? '📷 Photo' : msg.reply_to.content}</p>
                              </div>
                            )}

                            {/* Dynamic Multi-Image Grid View */}
                            {isImageMsg ? (
                              <div
                                className={`grid gap-1 my-1 rounded-xl overflow-hidden ${
                                  imageUrls.length === 1
                                    ? 'grid-cols-1'
                                    : imageUrls.length === 2
                                    ? 'grid-cols-2'
                                    : 'grid-cols-2'
                                }`}
                              >
                                {imageUrls.slice(0, 4).map((url, imgIdx) => (
                                  <div
                                    key={imgIdx}
                                    onClick={() => openGallery(imageUrls, imgIdx)}
                                    className="relative aspect-square cursor-pointer overflow-hidden bg-slate-900/10 group/img"
                                  >
                                    <img
                                      src={url}
                                      alt="attachment"
                                      className="w-full h-full object-cover group-hover/img:scale-105 transition duration-200"
                                    />
                                    {imgIdx === 3 && imageUrls.length > 4 && (
                                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-extrabold text-sm">
                                        +{imageUrls.length - 4}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="leading-relaxed">{msg.content}</p>
                            )}

                            <div className="flex items-center justify-end space-x-1">
                              <span className={`text-[9px] ${isMe ? 'text-purple-200' : 'text-slate-400'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>

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

              {/* REPLIED PREVIEW BAR */}
              {replyToMessage && (
                <div className="px-4 py-2 bg-purple-50 dark:bg-slate-800/90 border-t border-purple-100 dark:border-slate-700 flex items-center justify-between">
                  <div className="border-l-2 border-purple-600 pl-2 text-xs min-w-0 flex-1">
                    <p className="font-bold text-purple-600 dark:text-purple-400 text-[10px]">
                      Replying to {replyToMessage.sender_id === session.user.id ? 'Yourself' : getDisplayName(activeUser)}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 truncate text-[11px]">
                      {replyToMessage.content?.startsWith('[IMAGES]:') || replyToMessage.content?.startsWith('[IMAGE]:')
                        ? '📷 Photo'
                        : replyToMessage.content}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyToMessage(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* INPUT BAR / BLOCK WARNING BANNER */}
              {iBlockedUser ? (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-red-50 dark:bg-red-950/20 text-center flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">
                    You have blocked {getDisplayName(activeUser)}. Unblock to send messages.
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
                    You cannot reply. {getDisplayName(activeUser)} has blocked you.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 pb-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center space-x-2"
                >
                  <label className="p-2 text-slate-400 hover:text-purple-600 cursor-pointer rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    <ImageIcon className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleMultipleImagesUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>

                  <input
                    type="text"
                    placeholder={uploadingImage ? 'Uploading image(s)...' : `Message ${getDisplayName(activeUser)}...`}
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

      {/* MULTI-IMAGE CAROUSEL LIGHTBOX SLIDER */}
      {galleryImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <button
            onClick={() => setGalleryImages([])}
            className="absolute top-5 right-5 text-white bg-slate-800/80 p-2 rounded-full hover:bg-slate-700 transition z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <a
            href={galleryImages[activeGalleryIndex]}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="absolute top-5 right-18 text-white bg-slate-800/80 p-2 rounded-full hover:bg-slate-700 transition z-10"
          >
            <Download className="w-6 h-6" />
          </a>

          {/* Slider Arrows */}
          {galleryImages.length > 1 && (
            <>
              <button
                onClick={() =>
                  setActiveGalleryIndex((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1))
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={() =>
                  setActiveGalleryIndex((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0))
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="flex flex-col items-center max-w-full max-h-[85vh]">
            <img
              src={galleryImages[activeGalleryIndex]}
              alt="full view"
              className="max-w-full max-h-[75vh] rounded-2xl object-contain shadow-2xl"
            />
            {galleryImages.length > 1 && (
              <span className="text-white/80 text-xs mt-3 font-semibold bg-black/40 px-3 py-1 rounded-full">
                {activeGalleryIndex + 1} / {galleryImages.length}
              </span>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
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
