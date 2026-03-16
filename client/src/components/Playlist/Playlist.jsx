// components/Playlist/Playlist.jsx — Song queue with active state, remove button (host only)

import React from 'react';
import toast from 'react-hot-toast';

export default function Playlist({
  playlist,
  currentSongIndex,
  isPlaying,
  isHost,
  onSelect,
  onRemove,
}) {
  function handleSelect(idx) {
    if (!isHost) { toast.error('🔒 Only the host can change songs'); return; }
    onSelect(idx);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>
          Playlist
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: '#ede9fe', color: '#6c5ce7' }}>
          {playlist.length} {playlist.length === 1 ? 'song' : 'songs'}
        </span>
      </div>

      {playlist.length === 0 ? (
        <div className="text-center py-10" style={{ color: '#9ca3af' }}>
          <div className="text-3xl mb-2">🎵</div>
          <div className="text-sm">No songs yet.</div>
          <div className="text-xs mt-1">Upload the first one!</div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {playlist.map((song, idx) => {
            const isActive = idx === currentSongIndex;
            return (
              <div
                key={song.id || idx}
                onClick={() => handleSelect(idx)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-all group"
                style={{
                  background: isActive ? '#ede9fe' : 'transparent',
                  border: isActive ? '1px solid #c4b5fd' : '1px solid transparent',
                }}>

                {/* Index or playing bars */}
                <div className="w-5 flex items-center justify-center flex-shrink-0">
                  {isActive && isPlaying ? (
                    <div className="flex items-end gap-0.5" style={{ height: '16px' }}>
                      <div className="playing-bar w-1 rounded-sm" style={{ background: '#6c5ce7' }} />
                      <div className="playing-bar w-1 rounded-sm" style={{ background: '#6c5ce7', animationDelay: '0.15s' }} />
                      <div className="playing-bar w-1 rounded-sm" style={{ background: '#6c5ce7', animationDelay: '0.3s' }} />
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: isActive ? '#6c5ce7' : '#9ca3af' }}>
                      {idx + 1}
                    </span>
                  )}
                </div>

                {/* Song info */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate"
                    style={{ color: isActive ? '#6c5ce7' : '#1e1b4b' }}>
                    {song.name}
                  </div>
                  <div className="text-xs truncate" style={{ color: '#9ca3af' }}>
                    {song.uploader}
                  </div>
                </div>

                {/* Duration */}
                <span className="text-xs flex-shrink-0" style={{ color: '#9ca3af' }}>
                  {song.duration || '--:--'}
                </span>

                {/* Remove button (host only) */}
                {isHost && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-xs transition-opacity flex-shrink-0"
                    style={{ background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer', lineHeight: 1 }}
                    title="Remove song">
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}