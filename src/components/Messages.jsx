import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Search, Send, Loader2, MessageSquare, ArrowLeft, Image as ImageIcon, 
  Check, CheckCheck, X, Download, Trash2, MoreVertical, Pin, PinOff, 
  Slash, RefreshCw, AlertCircle, Reply, ChevronLeft, ChevronRight
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

  // Handle Multiple Images Upload
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
      confirmBg: 'bg-rose-600 hover:bg-rose-700',
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
      confirmBg: 'bg-rose-600 hover:bg-rose-700',
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
        confirmBg: 'bg-emerald-600 hover:bg-emerald-700',
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
        confirmBg: 'bg-rose-600 hover:bg-rose-700',
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
    <div className="w-full h-[100dvh] overflow-hidden bg-slate-100/60 md:p-3 pb-16 md:pb-3 font-sans antialiased text-slate-800">
      <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-3 max-w-7xl mx-auto">
        
        {/* INBOX SIDEBAR */}
        <div
          className={`md:col-span-4 lg:col-span-3 bg-white md:rounded-3xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden min-h-0 transition-all duration-300 ${
            activeUser ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                Messages
              </h2>
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                {conversations.length} chats
              </span>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search messages or users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 placeholder-slate-400 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {searchQuery.trim() ? (
              searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                    <Search className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-xs font-medium text-slate-500">No users found</p>
                </div>
              ) : (
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="flex items-center space-x-3 p-3 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all group"
                  >
                    <div className="relative w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm overflow-hidden flex-shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        getDisplayName(user)[0].toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-purple-600 transition-colors">
                        {getDisplayName(user)}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        @{user.username}
                      </p>
                    </div>
                  </div>
                ))
              )
            ) : loading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6 text-purple-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No recent chats</p>
                <p className="text-xs text-slate-400 mt-1">Search someone above to start chatting!</p>
              </div>
            ) : (
              conversations.map((user) => {
                const isActive = activeUser?.id === user.id;
                const isPinned = pinnedChats.includes(user.id);

                return (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`group relative flex items-center space-x-3 p-3 rounded-2xl cursor-pointer transition-all ${
                      isActive
                        ? 'bg-purple-50/80 border border-purple-200/60 shadow-sm'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm overflow-hidden flex-shrink-0 shadow-sm">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        getDisplayName(user)[0].toUpperCase()
                      )}
                      {user.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-baseline">
                        <div className="flex items-center gap-1 min-w-0">
                          <p
                            className={`text-sm font-semibold truncate ${
                              isActive ? 'text-purple-900' : 'text-slate-800'
                            }`}
                          >
                            {getDisplayName(user)}
                          </p>
                          {isPinned && <Pin className="w-3 h-3 text-purple-600 fill-purple-600 flex-shrink-0 rotate-45" />}
                        </div>

                        {user.lastMessageTime && (
                          <span className="text-[10px] text-slate-400 flex-shrink-0 font-medium">
                            {new Date(user.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-0.5">
                        <p className="text-xs text-slate-500 truncate max-w-[80%]">
                          {user.lastMessage || 'Tap to open chat'}
                        </p>
                        {user.unreadCount > 0 && (
                          <span className="bg-purple-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-4 px-1 flex items-center justify-center">
                            {user.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => togglePinChat(user.id, e)}
                      title={isPinned ? 'Unpin Chat' : 'Pin Chat'}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-purple-100 rounded-full transition-all text-slate-400 hover:text-purple-600"
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
          className={`md:col-span-8 lg:col-span-9 bg-white md:rounded-3xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden min-h-0 relative transition-all duration-300 ${
            !activeUser ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeUser ? (
            <>
              {/* HEADER */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white z-20 relative">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setActiveUser(null)}
                    className="md:hidden text-slate-600 hover:text-purple-600 p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm overflow-hidden flex-shrink-0 shadow-sm">
                      {activeUser.avatar_url ? (
                        <img src={activeUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        getDisplayName(activeUser)[0].toUpperCase()
                      )}
                    </div>
                    {isOnline && !iBlockedUser && !userBlockedMe && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 truncate">
                      {getDisplayName(activeUser)}
                    </h3>
                    {iBlockedUser ? (
                      <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Blocked
                      </span>
                    ) : userBlockedMe ? (
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Slash className="w-3 h-3" /> Unavailable
                      </span>
                    ) : isTyping ? (
                      <span className="text-[10px] text-purple-600 font-semibold animate-pulse">
                        typing...
                      </span>
                    ) : isOnline ? (
                      <span className="text-[10px] text-emerald-600 font-medium">Active now</span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-normal">
                        {formatLastSeen(lastSeen)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {/* 3-DOTS MENU */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-2 text-slate-500 hover:text-purple-600 hover:bg-slate-50 rounded-full transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {showMenu && (
                      <div className="absolute right-0 top-10 w-48 bg-white border border-slate-200 rounded-2xl shadow-lg py-1.5 z-30 space-y-0.5 overflow-hidden">
                        <button
                          onClick={() => {
                            setShowChatSearch(!showChatSearch);
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                        >
                          <Search className="w-3.5 h-3.5 text-slate-400" /> Search in Chat
                        </button>

                        <button
                          onClick={handleClearChat}
                          className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-slate-400" /> Clear Chat
                        </button>

                        <button
                          onClick={handleToggleBlock}
                          className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors border-t border-slate-100"
                        >
                          <Slash className="w-3.5 h-3.5" /> {iBlockedUser ? 'Unblock User' : 'Block User'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* IN-CHAT SEARCH BAR */}
              {showChatSearch && (
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between z-10">
                  <div className="relative flex-1 mr-2">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search messages..."
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      className="w-full bg-white text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setShowChatSearch(false);
                      setChatSearchQuery('');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* MESSAGES FEED */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-slate-50/50 custom-scrollbar">
                {filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-3 text-center">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {chatSearchQuery ? 'No messages found.' : `Say hi to ${getDisplayName(activeUser)}!`}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {chatSearchQuery ? 'Try a different keyword' : 'Start conversation with a friendly message'}
                      </p>
                    </div>
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
                            <span className="text-[10px] font-semibold bg-slate-200/70 text-slate-600 px-3 py-1 rounded-full uppercase tracking-wider">
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
                          {/* Swipe Reply Indicator */}
                          {dragMsgId === msg.id && Math.abs(currentOffset) > 15 && (
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 p-1.5 bg-purple-600 text-white rounded-full shadow transition-all ${
                                isMe ? 'right-2' : 'left-2'
                              }`}
                            >
                              <Reply className="w-3 h-3" />
                            </div>
                          )}

                          {/* Hover Action Toolbar */}
                          {activeHoverMessage === msg.id && !iBlockedUser && !userBlockedMe && (
                            <div
                              className={`absolute -top-8 ${
                                isMe ? 'right-0' : 'left-0'
                              } bg-white shadow-md rounded-full px-2 py-1 flex items-center space-x-1 border border-slate-200 z-20`}
                            >
                              {['❤️', '😂', '👍', '🔥'].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleAddReaction(msg.id, emoji)}
                                  className="text-xs hover:scale-125 transition-transform px-0.5"
                                >
                                  {emoji}
                                </button>
                              ))}
                              <button
                                onClick={() => setReplyToMessage(msg)}
                                className="text-slate-500 hover:text-purple-600 p-0.5 hover:bg-slate-100 rounded-full transition-colors"
                                title="Reply"
                              >
                                <Reply className="w-3 h-3" />
                              </button>
                              {isMe && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="text-rose-500 hover:text-rose-600 p-0.5 hover:bg-rose-50 rounded-full transition-colors border-l border-slate-100 pl-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}

                          {/* Message Bubble Container */}
                          <div
                            style={{ transform: `translateX(${currentOffset}px)` }}
                            className={`relative max-w-[85%] sm:max-w-[70%] px-3.5 py-2.5 rounded-2xl text-sm space-y-1 transition-transform ease-out ${
                              isMe
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-xs shadow-sm'
                                : 'bg-white text-slate-800 border border-slate-200/70 rounded-bl-xs shadow-xs'
                            }`}
                          >
                            {/* Replying Banner Inside Message */}
                            {msg.reply_to && (
                              <div
                                className={`p-2 rounded-lg text-[11px] mb-1.5 border-l-2 ${
                                  isMe
                                    ? 'bg-black/15 border-white/40 text-purple-100'
                                    : 'bg-purple-50 border-purple-500 text-slate-700'
                                }`}
                              >
                                <p className="font-semibold text-[10px] opacity-90">
                                  {msg.reply_to.sender_id ? (
                                    msg.reply_to.sender_id === session.user.id ? 'You' : getDisplayName(activeUser)
                                  ) : (
                                    msg.reply_to.sender_name === 'You'
                                      ? (msg.sender_id === session.user.id ? 'You' : getDisplayName(activeUser))
                                      : (msg.reply_to.sender_name || 'User')
                                  )}
                                </p>
                                <p className="truncate font-normal opacity-80 text-[10px]">
                                  {msg.reply_to.content?.startsWith('[IMAGES]:') || msg.reply_to.content?.startsWith('[IMAGE]:') ? '📷 Photo' : msg.reply_to.content}
                                </p>
                              </div>
                            )}

                            {/* Images View */}
                            {isImageMsg ? (
                              <div
                                className={`grid gap-1 my-1 rounded-xl overflow-hidden ${
                                  imageUrls.length === 1
                                    ? 'grid-cols-1'
                                    : 'grid-cols-2'
                                }`}
                              >
                                {imageUrls.slice(0, 4).map((url, imgIdx) => (
                                  <div
                                    key={imgIdx}
                                    onClick={() => openGallery(imageUrls, imgIdx)}
                                    className="relative aspect-square cursor-pointer overflow-hidden bg-slate-100 group/img"
                                  >
                                    <img
                                      src={url}
                                      alt="attachment"
                                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                                    />
                                    {imgIdx === 3 && imageUrls.length > 4 && (
                                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xs">
                                        +{imageUrls.length - 4}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="leading-relaxed break-words font-medium">{msg.content}</p>
                            )}

                            <div className="flex items-center justify-end space-x-1 mt-0.5">
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
                                } bg-white border border-slate-200 rounded-full px-1.5 py-0.5 text-[9px] shadow-xs flex items-center gap-0.5 text-slate-700`}
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
                <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
                  <div className="border-l-2 border-purple-600 pl-3.5 text-xs min-w-0 flex-1">
                    <p className="font-semibold text-purple-600 text-[10px] flex items-center gap-1">
                      <Reply className="w-3 h-3" /> Replying to {replyToMessage.sender_id === session.user.id ? 'Yourself' : getDisplayName(activeUser)}
                    </p>
                    <p className="text-slate-600 truncate text-[11px]">
                      {replyToMessage.content?.startsWith('[IMAGES]:') || replyToMessage.content?.startsWith('[IMAGE]:')
                        ? '📷 Photo'
                        : replyToMessage.content}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyToMessage(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* INPUT BAR */}
              {iBlockedUser ? (
                <div className="p-3 border-t border-slate-200 bg-rose-50 text-center flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <p className="text-xs font-semibold text-rose-600">
                    You blocked {getDisplayName(activeUser)}
                  </p>
                  <button
                    onClick={handleToggleBlock}
                    className="text-xs font-bold text-purple-600 hover:underline"
                  >
                    Unblock
                  </button>
                </div>
              ) : userBlockedMe ? (
                <div className="p-3 border-t border-slate-200 bg-slate-50 text-center flex items-center justify-center gap-2">
                  <Slash className="w-4 h-4 text-slate-400" />
                  <p className="text-xs font-medium text-slate-500">
                    You cannot reply to this conversation.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-slate-200 bg-white flex items-center space-x-2"
                >
                  <label className="p-2 text-slate-400 hover:text-purple-600 cursor-pointer rounded-full hover:bg-slate-100 transition-colors">
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
                    placeholder={uploadingImage ? 'Uploading image...' : `Message ${getDisplayName(activeUser)}...`}
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    disabled={uploadingImage}
                    className="flex-1 bg-slate-100 border border-transparent rounded-full px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 placeholder-slate-400 transition-all"
                  />

                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending || uploadingImage}
                    className="bg-purple-600 hover:bg-purple-700 text-white p-2.5 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center shadow-xs"
                  >
                    {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-slate-400 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-purple-500" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-700">Your Direct Messages</p>
                <p className="text-xs text-slate-400 mt-1">
                  Select a user from the left list to view or start conversation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CAROUSEL LIGHTBOX */}
      {galleryImages.length > 0 && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setGalleryImages([])}
        >
          <button
            onClick={() => setGalleryImages([])}
            className="absolute top-5 right-5 text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <a
            href={galleryImages[activeGalleryIndex]}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="absolute top-5 right-16 text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all z-10"
          >
            <Download className="w-5 h-5" />
          </a>

          {galleryImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveGalleryIndex((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveGalleryIndex((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div 
            className="flex flex-col items-center max-w-full max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={galleryImages[activeGalleryIndex]}
              alt="full view"
              className="max-w-full max-h-[75vh] rounded-xl object-contain"
            />
            {galleryImages.length > 1 && (
              <span className="text-white/80 text-xs mt-3 font-medium bg-black/40 px-3 py-1 rounded-full">
                {activeGalleryIndex + 1} / {galleryImages.length}
              </span>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setConfirmModal(null)}
        >
          <div 
            className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  {confirmModal.message}
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              {!confirmModal.hideCancel && (
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-xs ${
                  confirmModal.confirmBg || 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}