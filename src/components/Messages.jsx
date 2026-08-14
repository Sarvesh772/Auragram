import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Send, Loader2, MessageSquare, ArrowLeft, Image } from 'lucide-react';

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

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchRecentConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Feature 3 Helper: Date Separators Format
  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Feature 4 Fix & Realtime Subscription
  useEffect(() => {
    if (!activeUser) return;

    fetchMessages(activeUser.id);

    const channel = supabase
      .channel(`chat_${session.user.id}_${activeUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new;
          if (
            (newMsg.sender_id === session.user.id && newMsg.receiver_id === activeUser.id) ||
            (newMsg.sender_id === activeUser.id && newMsg.receiver_id === session.user.id)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            // Update sidebar last message preview dynamically
            fetchRecentConversations();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activeUser]);

  // Search User
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

  // Feature 1: Fetch Recent Conversations + Last Message Preview
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

    // Map to find unique users with their latest message
    const conversationMap = new Map();

    userMessages.forEach((msg) => {
      const otherId = msg.sender_id === session.user.id ? msg.receiver_id : msg.sender_id;
      if (!conversationMap.has(otherId)) {
        conversationMap.set(otherId, msg);
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
          };
        });

        // Sort by last message time (latest first)
        enrichedConversations.sort(
          (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
        );

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

  // Fetch Chat History
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

  // Feature 2: Send Text Message
  async function handleSendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim() || !activeUser || sending) return;

    const text = newMessage.trim();
    const tempMessage = {
      id: Date.now().toString(),
      sender_id: session.user.id,
      receiver_id: activeUser.id,
      content: text,
      created_at: new Date().toISOString(),
    };

    setNewMessage('');
    setSending(true);

    setMessages((prev) => [...prev, tempMessage]);

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

    if (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    } else if (data) {
      fetchRecentConversations();
    }
  }

  // Feature 5: Image Upload Handler (Supabase Storage)
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeUser) return;

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

      // Send image message with tag
      const { data, error } = await supabase.from('messages').insert([
        {
          sender_id: session.user.id,
          receiver_id: activeUser.id,
          content: `[IMAGE]:${imageUrl}`,
        },
      ]).select();

      if (!error && data) {
        setMessages((prev) => [...prev, data[0]]);
        fetchRecentConversations();
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Failed to send image. Make sure "chat-attachments" bucket is public on Supabase.');
    } finally {
      setUploadingImage(false);
    }
  };

  function handleSelectUser(user) {
    setActiveUser(user);
    setSearchQuery('');
    setSearchResults([]);
  }

  return (
    <div className="w-full h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 md:p-2 pb-14 md:pb-2">
      <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-4">
        {/* ================= INBOX SIDEBAR (3.5 / 12 Cols) ================= */}
        <div
          className={`md:col-span-4 lg:col-span-3 bg-white dark:bg-slate-900 md:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden min-h-0 ${
            activeUser ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Messages</h2>

            {/* SEARCH BOX */}
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

          {/* SEARCH RESULTS OR RECENT CHATS */}
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
                return (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`flex items-center space-x-3 p-3 rounded-2xl cursor-pointer transition ${
                      isActive
                        ? 'bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden flex-shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        (user.full_name || user.username || 'U')[0].toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-baseline">
                        <p
                          className={`text-xs font-bold truncate ${
                            isActive ? 'text-purple-700 dark:text-purple-300' : 'text-slate-800 dark:text-white'
                          }`}
                        >
                          @{user.username || 'user'}
                        </p>
                        {user.lastMessageTime && (
                          <span className="text-[9px] text-slate-400">
                            {new Date(user.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      {/* Feature 1: Last Message Preview */}
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {user.lastMessage || 'Tap to open messages'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= FULL EXPANDED CHAT WINDOW (8.5 / 12 Cols) ================= */}
        <div
          className={`md:col-span-8 lg:col-span-9 bg-white dark:bg-slate-900 md:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden min-h-0 ${
            !activeUser ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeUser ? (
            <>
              {/* ACTIVE CHAT HEADER */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
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
                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                    </span>
                  </div>
                </div>
              </div>

              {/* MESSAGES FEED (Feature 3: Date Separators & Feature 5: Render Images) */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
                {messages.length === 0 ? (
                  <div className="text-center py-20 space-y-2">
                    <MessageSquare className="w-8 h-8 text-purple-300 dark:text-purple-800 mx-auto" />
                    <p className="text-xs font-semibold text-slate-400">
                      Say hi to <span className="text-slate-700 dark:text-slate-200">@{activeUser.username}</span>!
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMe = msg.sender_id === session.user.id;
                    const currentDateStr = new Date(msg.created_at).toDateString();
                    const prevDateStr = index > 0 ? new Date(messages[index - 1].created_at).toDateString() : null;
                    const showDateHeader = currentDateStr !== prevDateStr;

                    const isImage = msg.content?.startsWith('[IMAGE]:');
                    const imageUrl = isImage ? msg.content.replace('[IMAGE]:', '') : null;

                    return (
                      <React.Fragment key={msg.id || index}>
                        {/* Feature 3: Date Separator */}
                        {showDateHeader && (
                          <div className="flex justify-center my-3">
                            <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full uppercase tracking-wider">
                              {formatDateHeader(msg.created_at)}
                            </span>
                          </div>
                        )}

                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[80%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl text-xs font-semibold space-y-1 ${
                              isMe
                                ? 'bg-purple-600 text-white rounded-br-none shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-bl-none shadow-2xs'
                            }`}
                          >
                            {/* Feature 5: Show Image or Text */}
                            {isImage ? (
                              <img src={imageUrl} alt="attachment" className="rounded-lg max-h-60 w-full object-cover my-1" />
                            ) : (
                              <p className="leading-relaxed">{msg.content}</p>
                            )}

                            <p className={`text-[9px] text-right ${isMe ? 'text-purple-200' : 'text-slate-400'}`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* MESSAGE INPUT BAR (Feature 2: Enter send & Feature 5: Attach Image) */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 pb-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center space-x-2"
              >
                <label className="p-2 text-slate-400 hover:text-purple-600 cursor-pointer rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  <Image className="w-5 h-5" />
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                </label>

                <input
                  type="text"
                  placeholder={uploadingImage ? 'Uploading image...' : `Message @${activeUser.username}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
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
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-slate-400 p-6 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-semibold">Select or search a user from the left inbox to start chatting!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}