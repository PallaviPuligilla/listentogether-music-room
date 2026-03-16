// components/Participants/Participants.jsx

import React from 'react';

const AVATAR_COLORS = [
  { bg: '#ede9fe', fg: '#6c5ce7' }, { bg: '#fce7f3', fg: '#ec4899' },
  { bg: '#d1fae5', fg: '#059669' }, { bg: '#fef3c7', fg: '#d97706' },
  { bg: '#dbeafe', fg: '#2563eb' }, { bg: '#ffe4e6', fg: '#e11d48' },
  { bg: '#ecfdf5', fg: '#10b981' }, { bg: '#fdf2f8', fg: '#c026d3' },
];

function getColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name) { return name.slice(0, 2).toUpperCase(); }

export default function Participants({ participants, currentUser, roomId, songCount }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#9ca3af' }}>
        Participants ({participants.length})
      </div>

      <div className="flex flex-col gap-1 mb-6">
        {participants.map((p) => {
          const c = getColor(p.name);
          return (
            <div key={p.id || p.name}
              className="flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors hover:bg-purple-50">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: c.bg, color: c.fg }}>
                {initials(p.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: '#1e1b4b' }}>
                  {p.name}
                  {p.name === currentUser && (
                    <span className="ml-1.5 text-xs font-normal" style={{ color: '#9ca3af' }}>(you)</span>
                  )}
                </div>
                <div className="text-xs" style={{ color: '#9ca3af' }}>Listening</div>
              </div>
              {p.isHost && (
                <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full"
                  style={{ background: 'linear-gradient(135deg,#6c5ce7,#fd79a8)', whiteSpace: 'nowrap' }}>
                  HOST
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Room info */}
      <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#9ca3af' }}>
        Room Info
      </div>
      <div className="text-sm space-y-1.5" style={{ color: '#6b7280' }}>
        <div>Room ID: <strong style={{ color: '#6c5ce7' }}>{roomId}</strong></div>
        <div>You: <strong style={{ color: '#1e1b4b' }}>{currentUser}</strong></div>
        <div>Songs in queue: <strong style={{ color: '#1e1b4b' }}>{songCount}</strong></div>
      </div>
    </div>
  );
}