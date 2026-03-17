// pages/Room.jsx — Main room page (RESPONSIVE)

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import socket from '../socket';
import Participants from '../components/Participants/Participants';
import ActivityLog from '../components/ActivityLog/ActivityLog';
import Visualizer from '../components/Visualizer/Visualizer';
import Player from '../components/Player/Player';
import Playlist from '../components/Playlist/Playlist';
import Chat from '../components/Chat/Chat';
import './Room.css'; // ✅ NEW: Import responsive styles
import SongSearch from '../components/SongSearch/SongSearch';

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // ─── USER / ROOM STATE ─────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activities, setActivities] = useState([]);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  // ✅ NEW: Mobile tab state
  const [mobileTab, setMobileTab] = useState('player');

  const audioRef = useRef(null);

  // ─── ACTIVITY HELPER ────────────────────────────────────────────────────────
  const addActivity = useCallback((icon, text) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setActivities(prev => [{ icon, text, ts, id: Date.now() + Math.random() }, ...prev].slice(0, 30));
  }, []);

  // ─── CONNECT & EVENTS ───────────────────────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem('lt_user');
    if (!stored) { navigate('/'); return; }

    const userData = JSON.parse(stored);
    setUser(userData);
    setIsHost(userData.isHost);

    socket.connect();

    if (userData.isHost) {
      socket.emit('createRoom', { roomId, userName: userData.name });
    } else {
      socket.emit('joinRoom', { roomId, userName: userData.name });
    }

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('roomCreated', ({ participants, playlist }) => {
      setParticipants(participants);
      setPlaylist(playlist);
      addActivity('👑', userData.name + ' created the room');
    });

    socket.on('roomJoined', ({ participants, playlist, sync }) => {
      setParticipants(participants);
      setPlaylist(playlist);
      addActivity('👋', userData.name + ' joined the room');

      if (sync && sync.currentSongIndex >= 0 && playlist[sync.currentSongIndex]) {
        setCurrentSongIndex(sync.currentSongIndex);
        setIsPlaying(sync.isPlaying);
        setTimeout(() => {
          if (audioRef.current && sync.currentTime > 0) {
            audioRef.current.currentTime = sync.currentTime;
            if (sync.isPlaying) audioRef.current.play().catch(() => {});
          }
        }, 500);
        toast.success(`🔄 Synced to ${formatTime(sync.currentTime)} of "${playlist[sync.currentSongIndex].name}"`);
      }
    });

    socket.on('userJoined', ({ user: joinedUser, participants }) => {
      setParticipants(participants);
      addActivity('👋', joinedUser.name + ' joined the room');
      toast(`👋 ${joinedUser.name} joined the room!`, { icon: null });
    });

    socket.on('userLeft', ({ userName, participants, newHostName }) => {
      setParticipants(participants);
      addActivity('👋', userName + ' left the room');
      if (newHostName) {
        addActivity('👑', newHostName + ' is now the host');
        toast(`👑 ${newHostName} is now the host`);
        if (newHostName === userData.name) {
          setIsHost(true);
          toast.success("You're now the host!", { duration: 4000 });
        }
      }
    });

    
socket.on('play', ({ currentTime, songIndex }) => {
  if (songIndex !== undefined) setCurrentSongIndex(songIndex);
  setIsPlaying(true);
  if (audioRef.current) {
    audioRef.current.volume = 0.8;
    audioRef.current.muted = false;
    if (currentTime !== undefined) audioRef.current.currentTime = currentTime;
    audioRef.current.play()
      .then(() => console.log('✅ Playing from sync'))
      .catch((err) => {
        console.log('⚠️ Autoplay blocked on this device, user needs to tap play');
        toast('👆 Tap play to listen!', { duration: 3000 });
      });
  }
});

    socket.on('pause', ({ currentTime }) => {
      setIsPlaying(false);
      if (audioRef.current) {
        if (currentTime !== undefined) audioRef.current.currentTime = currentTime;
        audioRef.current.pause();
      }
    });

    socket.on('seek', ({ currentTime }) => {
      if (audioRef.current) audioRef.current.currentTime = currentTime;
    });

    socket.on('changeSong', ({ songIndex, currentTime }) => {
      setCurrentSongIndex(songIndex);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.currentTime = currentTime || 0;
        audioRef.current.play().catch(() => {});
      }
    });

    socket.on('songAdded', ({ song, playlist }) => {
      setPlaylist(playlist);
      addActivity('🎵', `${song.uploader} uploaded "${song.name}"`);
      toast.success(`"${song.name}" added to playlist!`);
    });

    socket.on('songRemoved', ({ playlist, currentSongIndex: newIdx }) => {
      setPlaylist(playlist);
      setCurrentSongIndex(newIdx);
    });

    socket.on('receiveMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('activity', ({ icon, text }) => {
      addActivity(icon, text);
    });

    socket.on('permissionDenied', ({ action }) => {
      toast.error(`🔒 Only the host can ${action}`);
    });

    socket.on('error', ({ message }) => {
      toast.error(message);
      navigate('/');
    });

    return () => {
      socket.emit('activity', { icon: '👋', text: userData.name + ' left the room' });
      socket.disconnect();
      socket.off();
    };
  }, [roomId, navigate, addActivity]);

  // ─── HOST ACTIONS ───────────────────────────────────────────────────────────

  function handlePlay(currentTime, songIndex) {
    socket.emit('play', { currentTime, songIndex });
    socket.emit('activity', { icon: '▶️', text: user.name + ' started the music' });
    setIsPlaying(true);
  }

  function handlePause(currentTime) {
    socket.emit('pause', { currentTime });
    socket.emit('activity', { icon: '⏸', text: user.name + ' paused the music' });
    setIsPlaying(false);
  }

  function handleSeek(currentTime) {
    socket.emit('seek', { currentTime });
    socket.emit('activity', { icon: '⏩', text: `${user.name} seeked to ${formatTime(currentTime)}` });
  }

  function handleChangeSong(idx) {
    setCurrentSongIndex(idx);
    setIsPlaying(true);
    socket.emit('changeSong', { songIndex: idx, currentTime: 0 });
    socket.emit('activity', { icon: '🎵', text: `${user.name} changed to "${playlist[idx]?.name}"` });
  }
  function handleSearchAddSong(song) {
  // Same as upload — sends song to all users via socket
  setPlaylist(prev => [...prev, song]);
  socket.emit('uploadSong', song);
  addActivity('🔍', `${user.name} added "${song.name}" from search`);
}

  function handleSongUpload(song) {
    const updatedPlaylist = [...playlist, song];
    setPlaylist(updatedPlaylist);
    socket.emit('uploadSong', song);
    addActivity('🎵', `${user.name} uploaded "${song.name}"`);
  }

  function handleRemoveSong(idx) {
    socket.emit('removeSong', { songIndex: idx });
  }

  function handleSendMessage(text) {
    socket.emit('sendMessage', { text, userName: user.name });
  }

  function handleLeave() {
    navigate('/');
  }

  function copyRoomId() {
    navigator.clipboard?.writeText(roomId);
    toast.success('Room ID copied!');
  }

  if (!user) return null;

  return (
    <div className="flex flex-col" style={{ minHeight: '100vh', background: '#f5f3ff' }}>

      {/* ════════ NAV (RESPONSIVE) ════════ */}
      <nav className="room-nav">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="nav-logo-icon">
            <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
              <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
            </svg>
          </div>
          <span className="nav-logo-text font-bold text-lg" style={{ color: '#1e1b4b' }}>
            Listen<span style={{ color: '#6c5ce7' }}>Together</span>
          </span>
        </div>

        {/* Room ID Badge */}
        <div className="nav-roomid">
          <div className="nav-pulse-dot" />
          <span className="nav-roomid-text">{roomId}</span>
          <button onClick={copyRoomId} className="nav-copy-btn">Copy</button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {connected && (
            <span className="nav-synced-badge">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              Synced
            </span>
          )}
          <button onClick={handleLeave} className="nav-leave-btn">
            Leave
          </button>
        </div>
      </nav>

      {/* ════════ MOBILE TABS (hidden on desktop) ════════ */}
      <div className="mobile-tabs">
        <button
          className={mobileTab === 'people' ? 'active' : ''}
          onClick={() => setMobileTab('people')}
        >
          👥 People ({participants.length})
        </button>
        <button
          className={mobileTab === 'player' ? 'active' : ''}
          onClick={() => setMobileTab('player')}
        >
          🎵 Player
        </button>
        <button
          className={mobileTab === 'playlist' ? 'active' : ''}
          onClick={() => setMobileTab('playlist')}
        >
          📋 Queue ({playlist.length})
        </button>
      </div>

      {/* ════════ BODY — 3 panels (responsive) ════════ */}
      <div className="room-body">

        {/* LEFT PANEL — Participants */}
        <div className={`room-panel room-panel-left ${mobileTab !== 'people' ? 'mobile-hidden' : ''}`}>
          <Participants
            participants={participants}
            currentUser={user.name}
            roomId={roomId}
            songCount={playlist.length}
          />
        </div>

        {/* CENTER PANEL — Player & Chat */}
        <div className={`room-panel room-panel-center ${mobileTab !== 'player' ? 'mobile-hidden' : ''}`}>
          <ActivityLog activities={activities} />
          <Visualizer audioRef={audioRef} isPlaying={isPlaying} />
          
          {/* CENTER PANEL */}
<div className={`room-panel room-panel-center ${mobileTab !== 'player' ? 'mobile-hidden' : ''}`}>
  <ActivityLog activities={activities} />
  <Visualizer audioRef={audioRef} isPlaying={isPlaying} />
  
  {/* ✅ NEW: Song Search */}
  <SongSearch
    onAddSong={handleSearchAddSong}
    userName={user.name}
  />
</div>
          <Chat
            messages={messages}
            currentUser={user.name}
            onSendMessage={handleSendMessage}
          />
        </div>

        {/* RIGHT PANEL — Playlist */}
        <div className={`room-panel room-panel-right ${mobileTab !== 'playlist' ? 'mobile-hidden' : ''}`}>
          <Playlist
            playlist={playlist}
            currentSongIndex={currentSongIndex}
            isPlaying={isPlaying}
            isHost={true}
            onSelect={handleChangeSong}
            onRemove={handleRemoveSong}
          />
        </div>
      </div>
    </div>
  );
}

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  return Math.floor(s / 60) + ':' + Math.floor(s % 60).toString().padStart(2, '0');
}