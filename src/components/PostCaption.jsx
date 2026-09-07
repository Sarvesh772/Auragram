import React, { useState } from 'react';
import { RenderFormattedText } from './MentionInput';

export default function PostCaption({ text, onViewProfile, className = '', disableTruncation = false }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  const needsToggle = !disableTruncation && (text.length > 150 || text.split('\n').length > 3);
  // Stop at a word boundary so hashtags/mentions are never split in half.
  const preview = (() => {
    if (!needsToggle || expanded) return text;
    const words = text.trim().split(/\s+/);
    let value = '';
    for (const word of words) {
      const next = value ? `${value} ${word}` : word;
      if (next.length > 150) break;
      value = next;
    }
    return value || words[0];
  })();

  return (
    <div className={`text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words ${className}`}>
      <p className={expanded || disableTruncation ? '' : 'line-clamp-3'}>
        <RenderFormattedText text={preview} onViewProfile={onViewProfile} />{needsToggle && !expanded && ' '}
        {needsToggle && (
          <button type="button" onClick={() => setExpanded(value => !value)} className="inline-block shrink-0 whitespace-nowrap font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 hover:underline">
            {expanded ? 'Show less' : '... Show more'}
          </button>
        )}
      </p>
    </div>
  );
}
