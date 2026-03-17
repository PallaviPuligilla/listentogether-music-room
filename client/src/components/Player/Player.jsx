import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { uploadAudio, formatDuration } from '../../utils/cloudinaryUpload';

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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const song = playlist[currentSongIndex] || null;

  // ── Load song when index changes ──
  useEffect(() => {
    if (!audioRef.current || !song) return;

    const audio = audioRef.current;

    // ✅ FIX: Stop previous audio first
    audio.pause();
    audio.currentTime = 0;

    console.log('🎵 Loading song:', song.name, song.url);

    audio.src = song.url;
    audio.load();
    audio.volume = volume / 100;

    // ✅ FIX: Wait for audio to be ready, then play
    const playWhenReady = () => {
      audio.play()
        .then(() => {
          setIsPlaying(true);
          console.log('✅ Audio playing! Volume:', audio.volume);
        })
        .catch((err) => {
          console.error('❌ Audio play failed:', err.message);
          // ✅ On mobile, autoplay might be blocked — user needs to tap play
          toast('Tap the play button to start! 🎵', { icon: '👆' });
        });
    };

    audio.addEventListener('canplay', playWhenReady, { once: true });

    return () => {
      audio.removeEventListener('canplay', playWhenReady);
    };
  }, [currentSongIndex, song?.url]);

  // ── Audio event listeners ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => {
      setDuration(audio.duration);
      console.log('✅ Audio loaded, duration:', audio.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      if (playlist.length > 1) {
        const next = (currentSongIndex + 1) % playlist.length;
        onChangeSong(next);
      }
    };
    // ✅ FIX: Log any audio errors
    const onError = (e) => {
      console.error('❌ Audio error:', audio.error);
      toast.error('Failed to play this song. Try another format.');
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [audioRef, currentSongIndex, playlist.length, onChangeSong]);

  function handlePlayPause() {
    if (!song) { toast('Upload a song first! 🎵'); return; }
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      onPause(audio.currentTime);
    } else {
      // ✅ FIX: Make sure volume is set before playing
      audio.volume = volume / 100;
      audio.muted = false;
      audio.play()
        .then(() => {
          setIsPlaying(true);
          onPlay(audio.currentTime, currentSongIndex);
        })
        .catch((err) => {
          console.error('Play failed:', err);
          toast.error('Tap again to play');
        });
    }
  }

  function handleSeekChange(e) {
    const audio = audioRef.current;
    if (!audio || isNaN(audio.duration)) return;
    const t = (e.target.value / 100) * audio.duration;
    audio.currentTime = t;
    setCurrentTime(t);
    onSeek(t);
  }

  function handlePrev() {
    if (playlist.length === 0) return;
    onChangeSong((currentSongIndex - 1 + playlist.length) % playlist.length);
  }

  function handleNext() {
    if (playlist.length === 0) return;
    onChangeSong((currentSongIndex + 1) % playlist.length);
  }

  function handleVolumeChange(e) {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) {
      audioRef.current.volume = v / 100;
      audioRef.current.muted = false;
    }
  }

  // ✅ FIX: Upload to Cloudinary — accept ALL audio formats
  async function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);

    for (const file of files) {
      // ✅ FIX: Max 25MB check
      if (file.size > 25 * 1024 * 1024) {
        toast.error(`"${file.name}" is too large. Max 25MB.`);
        continue;
      }

      // ✅ FIX: Accept ANY audio file — don't reject WhatsApp/unusual formats
      // Cloudinary will handle the conversion
      const isAudio = file.type.startsWith('audio/') || 
                      file.type.startsWith('video/') ||
                      file.name.match(/\.(mp3|wav|ogg|opus|m4a|aac|flac|wma|amr|webm)$/i) ||
                      file.type === '' ||
                      file.type === 'application/octet-stream';

      if (!isAudio) {
        toast.error(`"${file.name}" doesn't look like an audio file. Try MP3 or WAV.`);
        continue;
      }

      const name = file.name.replace(/\.[^.]+$/, '');

      try {
        toast.loading(`Uploading "${name}" to cloud...`, { id: 'upload-' + name });
        setUploadProgress(0);

        const result = await uploadAudio(file, (progress) => {
          setUploadProgress(progress);
        });

        toast.success(`"${name}" uploaded!`, { id: 'upload-' + name });
        console.log('✅ Cloudinary URL:', result.url);

        onUpload({
          name,
          url: result.url,
          type: file.type || 'audio/mpeg',
          uploader: userName,
          duration: formatDuration(result.duration),
        });

      } catch (err) {
        console.error('Upload error:', err);
        toast.error(`Failed to upload "${name}": ${err.message}`, { id: 'upload-' + name });
      }
    }

    setUploading(false);
    setUploadProgress(0);
    e.target.value = '';
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border"
      style={{ borderColor: 'rgba(108,92,231,0.13)', boxShadow: '0 2px 16px rgba(108,92,231,0.08)' }}>

      {/* Song info */}
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: song ? GRADIENTS[currentSongIndex % GRADIENTS.length] : '#ede9fe' }}>
          <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 sm:w-7 sm:h-7">
            <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm sm:text-base truncate" style={{ color: '#1e1b4b' }}>
            {song ? song.name : 'No song selected'}
          </div>
          <div className="text-xs sm:text-sm truncate" style={{ color: '#9ca3af' }}>
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
      <div className="mb-3 sm:mb-4">
        <input
          type="range" min="0" max="100" step="0.1"
          value={progress}
          onChange={handleSeekChange}
          className="w-full h-1 rounded-full mb-1.5"
          style={{ accentColor: '#6c5ce7', cursor: 'pointer', display: 'block' }}
        />
        <div className="flex justify-between text-xs" style={{ color: '#9ca3af' }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
        <button onClick={handlePrev}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
          style={{ background: '#f5f3ff', border: 'none', cursor: 'pointer' }}
          title="Previous">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#6c5ce7">
            <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6L9.5 12z"/>
          </svg>
        </button>

        <button onClick={handlePlayPause}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center"
          style={{
            background: '#6c5ce7',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(108,92,231,0.4)',
          }}>
          {isPlaying
            ? <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 sm:w-6 sm:h-6"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            : <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 sm:w-6 sm:h-6"><path d="M8 5v14l11-7z"/></svg>
          }
        </button>

        <button onClick={handleNext}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
          style={{ background: '#f5f3ff', border: 'none', cursor: 'pointer' }}
          title="Next">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#6c5ce7">
            <path d="M6 18l8.5-6L6 6v12zm2.5-6l6-4.5v9L8.5 12zM16 6h2v12h-2V6z"/>
          </svg>
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3 mb-3 sm:mb-4">
        <span className="text-base">🔈</span>
        <input type="range" min="0" max="100" value={volume}
          onChange={handleVolumeChange}
          className="flex-1"
          style={{ accentColor: '#6c5ce7', cursor: 'pointer' }}
        />
        <span className="text-base">🔊</span>
      </div>

      {/* Upload with progress */}
      {uploading ? (
        <div className="border-2 rounded-xl p-4 text-center"
          style={{ borderColor: '#6c5ce7', background: '#f5f3ff' }}>
          <div className="text-sm font-semibold mb-2" style={{ color: '#6c5ce7' }}>
            ⬆ Uploading... {uploadProgress}%
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#ede9fe' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${uploadProgress}%`,
                background: 'linear-gradient(90deg, #6c5ce7, #a29bfe)',
              }}
            />
          </div>
          <div className="text-xs mt-2" style={{ color: '#9ca3af' }}>
            Please wait while the song uploads to cloud...
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors hover:bg-purple-50"
          style={{ borderColor: '#c4b5fd' }}>
          <div className="text-sm font-semibold" style={{ color: '#6c5ce7' }}>⬆ Upload MP3</div>
          <div className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
            MP3, WAV, OGG, M4A, OPUS · Max 25MB
          </div>
        </div>
      )}

      {/* ✅ FIX: Accept more audio formats on mobile */}
      <input ref={fileInputRef} type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.opus,.aac,.flac,.amr,.webm"
        multiple
        onChange={handleFileUpload} style={{ display: 'none' }}
        disabled={uploading}
      />

      {/* ✅ FIX: crossOrigin for Cloudinary URLs + preload */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="auto"
        style={{ display: 'none' }}
      />
    </div>
  );
}