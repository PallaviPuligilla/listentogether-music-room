// components/Player/Player.jsx — Music player with controls, seek, volume, upload

import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  return Math.floor(s / 60) + ':' + Math.floor(s % 60).toString().padStart(2, '0');
}

const GRADIENTS = [
  'linear-gradient(135deg,#6c5ce7,#fd79a8)',
  'linear-gradient(135deg,#00cec9,#6c5ce7)',
  'linear-gradient(135deg,#fd79a8,#f59e0b)',
  'linear-gradient(135deg,#10b981,#6c5ce7)',
  'linear-gradient(135deg,#f59e0b,#fd79a8)',
];

export default function Player({
  audioRef,
  playlist,
  currentSongIndex,
  isPlaying,
  isHost,
  userName,
  onPlay,
  onPause,
  onSeek,
  onChangeSong,
  onUpload,
  setIsPlaying,
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const fileInputRef = useRef(null);

  const song = playlist[currentSongIndex] || null;

  // ── Load song when index changes ──
  useEffect(() => {
    if (!audioRef.current || !song) return;
    audioRef.current.src = song.url;
    audioRef.current.load();
    audioRef.current.volume = volume / 100;
    audioRef.current.play()
      .then(() => setIsPlaying(true))
      .catch(() => {});
  }, [currentSongIndex, song?.url]);

  // ── Audio event listeners ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => {
      setIsPlaying(false);
      // Auto-advance to next song
      if (isHost && playlist.length > 1) {
        const next = (currentSongIndex + 1) % playlist.length;
        onChangeSong(next);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioRef, isHost, currentSongIndex, playlist.length, onChangeSong]);

  function handlePlayPause() {
    if (!isHost) { toast.error('🔒 Only the host can control playback'); return; }
    if (!song) { toast('Upload a song first! 🎵'); return; }
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      onPause(audio.currentTime);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
      onPlay(audio.currentTime, currentSongIndex);
    }
  }

  function handleSeekChange(e) {
    if (!isHost) return;
    const audio = audioRef.current;
    if (!audio || isNaN(audio.duration)) return;
    const t = (e.target.value / 100) * audio.duration;
    audio.currentTime = t;
    setCurrentTime(t);
    onSeek(t);
  }

  function handlePrev() {
    if (!isHost) { toast.error('🔒 Only the host can skip songs'); return; }
    if (playlist.length === 0) return;
    onChangeSong((currentSongIndex - 1 + playlist.length) % playlist.length);
  }

  function handleNext() {
    if (!isHost) { toast.error('🔒 Only the host can skip songs'); return; }
    if (playlist.length === 0) return;
    onChangeSong((currentSongIndex + 1) % playlist.length);
  }

  function handleVolumeChange(e) {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v / 100;
  }

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const name = file.name.replace(/\.[^.]+$/, '');
      // Get duration via a temp audio element
      const dur = await new Promise(resolve => {
        const tmp = new Audio(url);
        tmp.addEventListener('loadedmetadata', () => resolve(tmp.duration));
        tmp.load();
      });
      onUpload({ name, url, type: file.type, uploader: userName, duration: formatTime(dur) });
    }
    e.target.value = '';
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl p-5 border"
      style={{ borderColor: 'rgba(108,92,231,0.13)', boxShadow: '0 2px 16px rgba(108,92,231,0.08)' }}>

      {/* Song info */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: song ? GRADIENTS[currentSongIndex % GRADIENTS.length] : '#ede9fe' }}>
          <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
            <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base truncate" style={{ color: '#1e1b4b' }}>
            {song ? song.name : 'No song selected'}
          </div>
          <div className="text-sm truncate" style={{ color: '#9ca3af' }}>
            {song ? (song.type || 'Audio') : 'Upload a song to begin'}
          </div>
          {song && (
            <div className="text-xs mt-0.5 font-medium" style={{ color: '#6c5ce7' }}>
              ⬆ Uploaded by {song.uploader}
            </div>
          )}
        </div>
      </div>

      {/* Seek bar */}
      <div className="mb-4">
        <input
          type="range" min="0" max="100" step="0.1"
          value={progress}
          onChange={handleSeekChange}
          disabled={!isHost}
          className="w-full h-1 rounded-full mb-1.5"
          style={{ accentColor: '#6c5ce7', cursor: isHost ? 'pointer' : 'not-allowed', display: 'block' }}
        />
        <div className="flex justify-between text-xs" style={{ color: '#9ca3af' }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-4">
        {/* Prev */}
        <button onClick={handlePrev}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
          style={{ background: '#f5f3ff', border: 'none', cursor: 'pointer' }}
          title="Previous">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#6c5ce7">
            <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6L9.5 12z"/>
          </svg>
        </button>

        {/* Play/Pause */}
        <button onClick={handlePlayPause}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105"
          style={{
            background: '#6c5ce7',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(108,92,231,0.4)',
          }}>
          {isPlaying
            ? <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            : <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6"><path d="M8 5v14l11-7z"/></svg>
          }
        </button>

        {/* Next */}
        <button onClick={handleNext}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
          style={{ background: '#f5f3ff', border: 'none', cursor: 'pointer' }}
          title="Next">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#6c5ce7">
            <path d="M6 18l8.5-6L6 6v12zm2.5-6l6-4.5v9L8.5 12zM16 6h2v12h-2V6z"/>
          </svg>
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-base">🔈</span>
        <input type="range" min="0" max="100" value={volume}
          onChange={handleVolumeChange}
          className="flex-1"
          style={{ accentColor: '#6c5ce7', cursor: 'pointer' }}
        />
        <span className="text-base">🔊</span>
      </div>

      {/* Host lock notice */}
      {!isHost && (
        <div className="text-center text-xs py-2 px-3 rounded-lg mb-3 font-medium"
          style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
          🔒 Only the host can control playback
        </div>
      )}

      {/* Upload */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors hover:bg-purple-50"
        style={{ borderColor: '#c4b5fd' }}>
        <div className="text-sm font-semibold" style={{ color: '#6c5ce7' }}>⬆ Upload MP3</div>
        <div className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>Click to add songs · MP3, WAV, OGG</div>
      </div>
      <input ref={fileInputRef} type="file" accept="audio/*" multiple
        onChange={handleFileUpload} style={{ display: 'none' }} />

      {/* Hidden audio element */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}