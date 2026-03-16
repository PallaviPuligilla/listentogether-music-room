// components/Chat/Chat.jsx — Real-time chat with emoji reactions

import React, { useState, useRef, useEffect } from 'react';

const AVATAR_COLORS = [
  { bg: '#ede9fe', fg: '#6c5ce7' }, { bg: '#fce7f3', fg: '#ec4899' },
  { bg: '#d1fae5', fg: '#059669' }, { bg: '#fef3c7', fg: '#d97706' },
  { bg: '#dbeafe', fg: '#2563eb' }, { bg: '#ffe4e6', fg: '#e11d48' },
];

function getColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name) { return name.slice(0, 2).toUpperCase(); }

function formatTimestamp(iso) {
  const d = new Date(iso);
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

const EMOJIS = ['🎵', '❤️', '🔥', '😍', '👏', '🎸', '🎶', '✨'];

export default function Chat({ messages, currentUser, onSendMessage }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setText('');
  }

  function sendEmoji(emoji) {
    onSendMessage(emoji);
  }

  return (
    <div className="bg-white rounded-2xl border flex flex-col overflow-hidden"
      style={{ borderColor: 'rgba(108,92,231,0.13)', minHeight: '200px', maxHeight: '280px' }}>

      {/* Header */}
      <div className="px-4 py-2.5 border-b flex items-center justify-between flex-shrink-0"
        style={{ borderColor: 'rgba(108,92,231,0.13)' }}>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>
          Live Chat
        </span>
        <span className="text-xs" style={{ color: '#9ca3af' }}>{messages.length} messages</span>
      </div>

      {/* Emoji quick-send */}
      <div className="flex gap-1 px-3 py-1.5 border-b flex-shrink-0"
        style={{ borderColor: 'rgba(108,92,231,0.08)' }}>
        {EMOJIS.map(e => (
          <button key={e} onClick={() => sendEmoji(e)}
            className="text-base px-1 py-0.5 rounded-lg transition-colors hover:bg-purple-50"
            style={{ border: 'none', background: 'none', cursor: 'pointer', lineHeight: 1.4 }}>
            {e}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-center text-xs py-4" style={{ color: '#9ca3af' }}>
            No messages yet. Say hi! 👋
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.userName === currentUser;
          const c = getColor(msg.userName);
          return (
            <div key={msg.id} className={`flex gap-2 items-end ${isOwn ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: c.bg, color: c.fg }}>
                {initials(msg.userName)}
              </div>

              {/* Bubble */}
              <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isOwn && (
                  <span className="text-xs font-bold mb-1" style={{ color: '#6c5ce7' }}>
                    {msg.userName}
                  </span>
                )}
                <div className="px-3 py-2 rounded-2xl text-sm leading-snug"
                  style={{
                    background: isOwn ? '#ede9fe' : '#f8f7ff',
                    color: '#1e1b4b',
                    borderRadius: isOwn ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                  }}>
                  {msg.text}
                </div>
                <span className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                  {formatTimestamp(msg.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-2.5 border-t flex-shrink-0"
        style={{ borderColor: 'rgba(108,92,231,0.13)' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Say something..."
          className="flex-1 rounded-full px-4 py-2 text-sm outline-none border"
          style={{
            borderColor: 'rgba(108,92,231,0.2)',
            background: '#f8f7ff',
            fontFamily: 'inherit',
            color: '#1e1b4b',
          }}
        />
        <button onClick={send}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: '#6c5ce7', border: 'none', cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}