// pages/Home.jsx — Landing page with Create / Join room modals

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function genRoomId() {
  return 'ROOM-' + Math.floor(1000 + Math.random() * 9000);
}

export default function Home() {
  const navigate = useNavigate();
  const [modal, setModal] = useState(null); // 'create' | 'join' | null
  const [createName, setCreateName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinId, setJoinId] = useState('');
  const generatedId = genRoomId();

  function handleCreate() {
    if (!createName.trim()) { toast.error('Please enter your name'); return; }
    // Store user info in sessionStorage for the Room page
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

      {/* Navbar */}
<div className="absolute top-0 left-0 w-full flex items-center justify-between px-8 py-5">
  <div className="flex items-center gap-2 font-bold text-lg" style={{ color: '#1e1b4b' }}>
    🎵 Listen<span style={{ color: '#6c5ce7' }}>Together</span>
  </div>

  <a
  href="https://github.com/PallaviPuligilla/listentogether-music-room"
  target="_blank"
  rel="noreferrer"
  className="px-4 py-2 rounded-lg text-sm font-semibold border"
  style={{ borderColor: '#c4b5fd', color: '#6c5ce7', background: 'white' }}
>
  GitHub
</a>
</div>
      {/* Logo */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: '#6c5ce7' }}>
          <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
            <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
          </svg>
        </div>
        <h1 className="text-4xl font-bold tracking-tight" style={{ color: '#1e1b4b' }}>
          Listen<span style={{ color: '#6c5ce7' }}>Together</span>
        </h1>
      </div>

      <p className="text-lg mb-10 text-center max-w-sm" style={{ color: '#6b7280', lineHeight: 1.6 }}>
        Listen to music with friends in real time — wherever you are.
      </p>

      {/* CTAs */}
      <div className="flex gap-3 flex-wrap justify-center mb-12">
        <button onClick={() => setModal('create')}
          className="px-8 py-3 rounded-xl font-semibold text-white text-base transition-all hover:-translate-y-0.5"
          style={{ background: '#6c5ce7', boxShadow: '0 4px 16px rgba(108,92,231,0.35)' }}>
          ✦ Create Room
        </button>
        <button onClick={() => setModal('join')}
          className="px-8 py-3 rounded-xl font-semibold text-base border-2 transition-all hover:-translate-y-0.5"
          style={{ color: '#6c5ce7', borderColor: '#c4b5fd', background: 'white' }}>
          → Join Room
        </button>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-3 justify-center">
        {[
          { color: '#6c5ce7', label: 'Synchronized playback' },
          { color: '#fd79a8', label: 'Live chat & reactions' },
          { color: '#00cec9', label: 'Upload any MP3' },
          { color: '#f59e0b', label: 'Host controls' },
          { color: '#10b981', label: 'Real-time visualizer' },
        ].map(f => (
          <div key={f.label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border text-sm"
            style={{ borderColor: 'rgba(108,92,231,0.15)', color: '#6b7280' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: f.color }} />
            {f.label}
          </div>
        ))}
      </div>
      {/* HOW IT WORKS */}
<div className="mt-16 max-w-3xl text-center">
  <h2 className="text-2xl font-bold mb-6" style={{ color: '#1e1b4b' }}>
    How It Works
  </h2>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

    <div className="bg-white p-5 rounded-xl border"
      style={{ borderColor: '#ede9fe' }}>
      <h3 className="font-semibold mb-2">1️⃣ Create Room</h3>
      <p className="text-sm text-gray-500">
        Start a private music room instantly.
      </p>
    </div>

    <div className="bg-white p-5 rounded-xl border"
      style={{ borderColor: '#ede9fe' }}>
      <h3 className="font-semibold mb-2">2️⃣ Invite Friends</h3>
      <p className="text-sm text-gray-500">
        Share the room ID with friends.
      </p>
    </div>

    <div className="bg-white p-5 rounded-xl border"
      style={{ borderColor: '#ede9fe' }}>
      <h3 className="font-semibold mb-2">3️⃣ Listen Together</h3>
      <p className="text-sm text-gray-500">
        Upload songs and enjoy synchronized playback.
      </p>
    </div>

  </div>
</div>

      {/* CREATE MODAL */}
      {modal === 'create' && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(30,27,75,0.22)', backdropFilter: 'blur(3px)' }}
          onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-1" style={{ color: '#1e1b4b' }}>✦ Create a Room</h2>
            <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>Enter your name to create a private music room.</p>

            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#9ca3af' }}>Your Name</label>
            <input value={createName} onChange={e => setCreateName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Pallavi"
              maxLength={20}
              className="w-full border rounded-xl px-4 py-3 mb-4 text-base outline-none focus:ring-2"
              style={{ borderColor: '#e0d9ff', fontFamily: 'inherit', color: '#1e1b4b',
                '--tw-ring-color': '#6c5ce7' }} />

            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#9ca3af' }}>Your Room ID (share this!)</label>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-6 cursor-pointer"
              style={{ background: '#ede9fe', border: '1px solid #c4b5fd' }}>
              <span className="flex-1 font-bold tracking-widest" style={{ color: '#6c5ce7' }}>{generatedId}</span>
              <button onClick={copyId} className="text-xs font-bold text-white px-3 py-1 rounded-lg"
                style={{ background: '#6c5ce7', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Copy
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModal(null)}
                className="px-5 py-3 rounded-xl border font-semibold text-sm"
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

      {/* JOIN MODAL */}
      {modal === 'join' && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(30,27,75,0.22)', backdropFilter: 'blur(3px)' }}
          onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-1" style={{ color: '#1e1b4b' }}>→ Join a Room</h2>
            <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>Enter your name and the room ID to join your friends.</p>

            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#9ca3af' }}>Your Name</label>
            <input value={joinName} onChange={e => setJoinName(e.target.value)}
              placeholder="e.g. Rahul" maxLength={20}
              className="w-full border rounded-xl px-4 py-3 mb-4 text-base outline-none"
              style={{ borderColor: '#e0d9ff', fontFamily: 'inherit', color: '#1e1b4b' }} />

            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#9ca3af' }}>Room ID</label>
            <input value={joinId} onChange={e => setJoinId(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="e.g. ROOM-4729" maxLength={12}
              className="w-full border rounded-xl px-4 py-3 mb-6 text-base outline-none uppercase tracking-widest"
              style={{ borderColor: '#e0d9ff', fontFamily: 'inherit', color: '#1e1b4b' }} />

            <div className="flex gap-3">
              <button onClick={() => setModal(null)}
                className="px-5 py-3 rounded-xl border font-semibold text-sm"
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
      {/* Footer */}
<div className="absolute bottom-4 text-sm text-gray-400">
  Built by Pallavi.P • React • Socket.IO
</div>
    </div>
  );
}