import React, { useState } from 'react';
import { Music, Check, X, Disc } from 'lucide-react';

// Preset Trending Audio Tracks (Aap Supabase storage/CDN links bhi de sakte hain)
export const PRESET_TRACKS = [
  { id: '1', title: 'Aesthetic Chill Vibes', artist: 'Lofi Beats', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: '2', title: 'Aura Synthwave', artist: 'Auragram Originals', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: '3', title: 'Trending Pop Groove', artist: 'Viral Sound', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: '4', title: 'Cyberpunk Electro', artist: 'Future Beats', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' }
];

export function AudioSelectorModal({ isOpen, onClose, onSelect, currentAudio }) {
  const [selectedId, setSelectedId] = useState(currentAudio?.id || null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[80] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
            <Music className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">Add Music / Track</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {PRESET_TRACKS.map((track) => {
            const isSelected = selectedId === track.id;
            return (
              <div
                key={track.id}
                onClick={() => {
                  setSelectedId(track.id);
                  onSelect(track);
                  onClose();
                }}
                className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer border transition ${
                  isSelected
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center">
                    <Disc className={`w-4 h-4 ${isSelected ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">{track.title}</p>
                    <p className="text-[10px] text-slate-400">{track.artist}</p>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
              </div>
            );
          })}
        </div>

        {currentAudio && (
          <button
            onClick={() => {
              setSelectedId(null);
              onSelect(null);
              onClose();
            }}
            className="w-full py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition"
          >
            Remove Selected Music
          </button>
        )}
      </div>
    </div>
  );
}

// Spinning Music Badge Component for Post / Reel Overlay
export function MusicBadge({ audioTitle, audioArtist }) {
  if (!audioTitle) return null;

  return (
    <div className="inline-flex max-w-full min-w-0 items-center space-x-2 bg-black/40 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full border border-white/10 text-white text-[10px] sm:text-[11px] font-medium">
      <Disc className="w-3.5 h-3.5 text-purple-400 animate-spin" />
      <span className="truncate max-w-[45vw] sm:max-w-[220px]">
        {audioTitle} {audioArtist ? `• ${audioArtist}` : ''}
      </span>
    </div>
  );
}
