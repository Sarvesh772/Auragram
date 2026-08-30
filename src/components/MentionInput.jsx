import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

// 1. Export Formatted Text Component for @Mentions Styling & Clicks
export function RenderFormattedText({ text, onViewProfile }) {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const username = part.slice(1);
          return (
            <span
              key={index}
              className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
              onClick={async (e) => {
                e.stopPropagation();
                const { data } = await supabase
                  .from('profiles')
                  .select('id')
                  .eq('username', username)
                  .maybeSingle();
                if (data?.id) onViewProfile?.(data.id);
              }}
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </span>
  );
}

// 2. Main Default Export for Auto-suggest Input Box
export default function MentionInput({ value, onChange, placeholder, onSend, className, currentUserId, rows = 2, compact = false }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!mentionQuery) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .neq('id', currentUserId)
        .ilike('username', `${mentionQuery}%`)
        .limit(5);

      if (data && data.length > 0) {
        setSuggestions(data);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [mentionQuery, currentUserId]);

  const handleChange = (e) => {
    const text = e.target.value;
    const position = e.target.selectionStart;
    onChange(text);
    setCursorPos(position);

    const textBeforeCursor = text.slice(0, position);
    const lastWord = textBeforeCursor.split(/\s+/).pop();

    if (lastWord.startsWith('@')) {
      const query = lastWord.slice(1);
      setMentionQuery(query);
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
    }
  };

  const handleSelectUser = (username) => {
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfterCursor = value.slice(cursorPos);
    const words = textBeforeCursor.split(/\s+/);
    words.pop();

    const newTextBefore = words.length > 0 ? words.join(' ') + ` @${username} ` : `@${username} `;
    const updatedText = newTextBefore + textAfterCursor;

    onChange(updatedText);
    setShowSuggestions(false);
    setMentionQuery('');
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="relative w-full min-w-0 flex-1">
      {/* Auto-suggest Popup Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Mention User
          </div>
          <div className="max-h-44 overflow-y-auto">
            {suggestions.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelectUser(user.username)}
                className="w-full flex items-center space-x-2.5 p-2 hover:bg-purple-50 dark:hover:bg-slate-800 text-left transition"
              >
                <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[10px] overflow-hidden flex-shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    (user.username || 'U')[0].toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                    {user.full_name || user.username}
                  </p>
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 truncate">@{user.username}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <textarea
        ref={inputRef}
        rows={rows}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${className || ''} resize-none ${compact ? 'min-h-[2rem] max-h-24 leading-5' : 'min-h-[2.5rem] max-h-32 leading-6'} overflow-y-auto whitespace-pre-wrap`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !showSuggestions && onSend) {
            onSend();
          }
        }}
      />
    </div>
  );
}
