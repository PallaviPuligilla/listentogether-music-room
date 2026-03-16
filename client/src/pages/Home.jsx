// pages/Home.jsx — Landing page (RESPONSIVE FIXED)

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function genRoomId() {
  return 'ROOM-' + Math.floor(1000 + Math.random() * 9000);
}

export default function Home() {
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const [createName, setCreateName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [generatedId] = useState(() => genRoomId());

  function handleCreate() {
    if (!createName.trim()) { toast.error('Please enter your name'); return; }
    sessionStorage.setItem('lt_user', JSON.stringify({ name: createName.trim(), isHost: true }));
    navigate(`/room/${generatedId}`);
  }

  function handleJoin() {
    if (!joinName.trim()) { toast.error('Please enter your name'); return; }
    if (!joinId.trim()) { toast.error('Please enter a room ID'); return; }
    sessionStorage.setItem('lt_user', JSON.stringify({ name: joinName.trim(), isHost: false }));
    navigate(`/room/${joinId.trim().toUpperCase()}`);
  }

  function copyId() {
    navigator.clipboard?.writeText(generatedId);
    toast.success('Room ID copied!');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative animated-bg">
      {/* Background blobs */}
      <div className="bg-blob bg-blob-1"></div>
      <div className="bg-blob bg-blob-2"></div>

      {/* ✅ Navbar — responsive padding */}
      <div className="absolute top-0 left-0 w-full flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 z-10">
        <div className="flex items-center gap-2 font-bold text-base sm:text-lg" style={{ color: '#1e1b4b' }}>
          🎵 Listen<span style={{ color: '#6c5ce7' }}>Together</span>
        </div>
        <a
          href="https://github.com/PallaviPuligilla/listentogether-music-room"
          target="_blank"
          rel="noreferrer"
          className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold border"
          style={{ borderColor: '#c4b5fd', color: '#6c5ce7', background: 'white' }}
        >
          GitHub
        </a>
      </div>

      {/* ✅ Logo — responsive size */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6 mt-16 sm:mt-0">
        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center"
          style={{ background: '#6c5ce7' }}>
          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 sm:w-7 sm:h-7">
            <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
          </svg>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight" style={{ color: '#1e1b4b' }}>
          Listen<span style={{ color: '#6c5ce7' }}>Together</span>
        </h1>
      </div>

      {/* ✅ Subtitle — responsive */}
      <p className="text-base sm:text-lg mb-6 sm:mb-10 text-center max-w-sm px-2" style={{ color: '#6b7280', lineHeight: 1.6 }}>
        Listen to music with friends in real time — wherever you are.
      </p>

      {/* ✅ CTAs — responsive */}
      <div className="flex gap-3 flex-wrap justify-center mb-8 sm:mb-12 w-full max-w-sm px-2">
        <button onClick={() => setModal('create')}
          className="flex-1 min-w-[140px] px-6 sm:px-8 py-3 rounded-xl font-semibold text-white text-sm sm:text-base transition-all hover:-translate-y-0.5"
          style={{ background: '#6c5ce7', boxShadow: '0 4px 16px rgba(108,92,231,0.35)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          ✦ Create Room
        </button>
        <button onClick={() => setModal('join')}
          className="flex-1 min-w-[140px] px-6 sm:px-8 py-3 rounded-xl font-semibold text-sm sm:text-base border-2 transition-all hover:-translate-y-0.5"
          style={{ color: '#6c5ce7', borderColor: '#c4b5fd', background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
          → Join Room
        </button>
      </div>

      {/* ✅ Feature pills — responsive */}
      <div className="flex flex-wrap gap-2 sm:gap-3 justify-center px-2">
        {[
          { color: '#6c5ce7', label: 'Synchronized playback' },
          { color: '#fd79a8', label: 'Live chat & reactions' },
          { color: '#00cec9', label: 'Upload any MP3' },
          { color: '#f59e0b', label: 'Host controls' },
          { color: '#10b981', label: 'Real-time visualizer' },
        ].map(f => (
          <div key={f.label} className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white border text-xs sm:text-sm"
            style={{ borderColor: 'rgba(108,92,231,0.15)', color: '#6b7280' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: f.color }} />
            {f.label}
          </div>
        ))}
      </div>

      {/* ✅ How it works — responsive */}
      <div className="mt-10 sm:mt-16 max-w-3xl text-center px-2 w-full">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6" style={{ color: '#1e1b4b' }}>
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white p-4 sm:p-5 rounded-xl border" style={{ borderColor: '#ede9fe' }}>
            <h3 className="font-semibold mb-2">1️⃣ Create Room</h3>
            <p className="text-sm text-gray-500">Start a private music room instantly.</p>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-xl border" style={{ borderColor: '#ede9fe' }}>
            <h3 className="font-semibold mb-2">2️⃣ Invite Friends</h3>
            <p className="text-sm text-gray-500">Share the room ID with friends.</p>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-xl border" style={{ borderColor: '#ede9fe' }}>
            <h3 className="font-semibold mb-2">3️⃣ Listen Together</h3>
            <p className="text-sm text-gray-500">Upload songs and enjoy synchronized playback.</p>
          </div>
        </div>
      </div>

      {/* ════════ CREATE MODAL (responsive) ════════ */}
      {modal === 'create' && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(30,27,75,0.22)', backdropFilter: 'blur(3px)' }}
          onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white rounded-2xl p-5 sm:p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-lg sm:text-xl font-bold mb-1" style={{ color: '#1e1b4b' }}>✦ Create a Room</h2>
            <p className="text-sm mb-4 sm:mb-6" style={{ color: '#9ca3af' }}>Enter your name to create a private music room.</p>

            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#9ca3af' }}>Your Name</label>
            <input value={createName} onChange={e => setCreateName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Pallavi"
              maxLength={20}
              className="w-full border rounded-xl px-4 py-3 mb-4 text-base outline-none"
              style={{ borderColor: '#e0d9ff', fontFamily: 'inherit', color: '#1e1b4b', fontSize: '16px' }} />

            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#9ca3af' }}>Your Room ID (share this!)</label>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 sm:mb-6 cursor-pointer"
              style={{ background: '#ede9fe', border: '1px solid #c4b5fd' }}>
              <span className="flex-1 font-bold tracking-widest text-sm sm:text-base" style={{ color: '#6c5ce7' }}>{generatedId}</span>
              <button onClick={copyId} className="text-xs font-bold text-white px-3 py-1 rounded-lg"
                style={{ background: '#6c5ce7', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Copy
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModal(null)}
                className="px-4 sm:px-5 py-3 rounded-xl border font-semibold text-sm"
                style={{ borderColor: '#e0d9ff', color: '#9ca3af', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleCreate}
                className="flex-1 py-3 rounded-xl font-semibold text-white text-sm"
                style={{ background: '#6c5ce7', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Create Room →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ JOIN MODAL (responsive) ════════ */}
      {modal === 'join' && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(30,27,75,0.22)', backdropFilter: 'blur(3px)' }}
          onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white rounded-2xl p-5 sm:p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-lg sm:text-xl font-bold mb-1" style={{ color: '#1e1b4b' }}>→ Join a Room</h2>
            <p className="text-sm mb-4 sm:mb-6" style={{ color: '#9ca3af' }}>Enter your name and the room ID to join your friends.</p>

            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#9ca3af' }}>Your Name</label>
            <input value={joinName} onChange={e => setJoinName(e.target.value)}
              placeholder="e.g. Rahul" maxLength={20}
              className="w-full border rounded-xl px-4 py-3 mb-4 text-base outline-none"
              style={{ borderColor: '#e0d9ff', fontFamily: 'inherit', color: '#1e1b4b', fontSize: '16px' }} />

            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#9ca3af' }}>Room ID</label>
            <input value={joinId} onChange={e => setJoinId(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="e.g. ROOM-4729" maxLength={12}
              className="w-full border rounded-xl px-4 py-3 mb-4 sm:mb-6 text-base outline-none uppercase tracking-widest"
              style={{ borderColor: '#e0d9ff', fontFamily: 'inherit', color: '#1e1b4b', fontSize: '16px' }} />

            <div className="flex gap-3">
              <button onClick={() => setModal(null)}
                className="px-4 sm:px-5 py-3 rounded-xl border font-semibold text-sm"
                style={{ borderColor: '#e0d9ff', color: '#9ca3af', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleJoin}
                className="flex-1 py-3 rounded-xl font-semibold text-white text-sm"
                style={{ background: '#6c5ce7', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Join Room →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Footer — responsive, not absolute on mobile */}
      <div className="mt-10 mb-4 sm:absolute sm:bottom-4 text-xs sm:text-sm text-gray-400 text-center">
        Built by Pallavi.P • React • Socket.IO
      </div>
    </div>
  );
}