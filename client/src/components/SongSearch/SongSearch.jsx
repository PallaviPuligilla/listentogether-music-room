import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function SongSearch({ onAddSong, userName }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [stats, setStats] = useState(null);
  const searchTimeout = useRef(null);

  function handleSearch(value) {
    setQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!value.trim()) {
      setResults([]);
      setStats(null);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `${SERVER_URL}/api/search?q=${encodeURIComponent(value)}`
        );
        const data = await res.json();
        setResults(data.data || []);
        setStats(data.stats || null);
      } catch (err) {
        console.error('Search error:', err);
        toast.error('Search failed');
        setResults([]);
      }
      setSearching(false);
    }, 500);
  }

  function handleAddSong(song) {
    if (!song.url) {
      toast.error('This song is not available');
      return;
    }

    const label = song.isPreview ? ' (30s preview)' : '';
    onAddSong({
      name: `${song.name} — ${song.artist}`,
      url: song.url,
      type: 'audio/mpeg',
      uploader: userName,
      duration: formatDuration(song.duration),
      cover: song.cover,
      artist: song.artist,
      album: song.album,
    });

    toast.success(`Added "${song.name}"!${label}`);
    setQuery('');
    setResults([]);
    setShowSearch(false);
  }

  if (!showSearch) {
    return (
      <button
        onClick={() => setShowSearch(true)}
        className="w-full rounded-xl p-3 text-center cursor-pointer transition-colors hover:bg-purple-50"
        style={{ background: 'white', fontFamily: 'inherit', border: '2px dashed #c4b5fd' }}>
        <div className="text-sm font-semibold" style={{ color: '#6c5ce7' }}>
          🔍 Search Songs
        </div>
        <div className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
          Search millions of songs · Free
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 border"
      style={{ borderColor: 'rgba(108,92,231,0.13)', boxShadow: '0 2px 16px rgba(108,92,231,0.08)' }}>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm" style={{ color: '#1e1b4b' }}>🔍 Search Songs</h3>
        <button
          onClick={() => { setShowSearch(false); setResults([]); setQuery(''); setStats(null); }}
          className="text-xs font-semibold px-3 py-1 rounded-lg"
          style={{ background: '#f5f3ff', color: '#6c5ce7', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          ✕ Close
        </button>
      </div>

      <div className="relative mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by song, artist..."
          className="w-full border rounded-xl px-4 py-2.5 text-sm outline-none pr-10"
          style={{ borderColor: '#e0d9ff', color: '#1e1b4b', fontSize: '16px' }}
          autoFocus
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && results.length > 0 && (
        <div className="text-xs mb-2 px-1" style={{ color: '#9ca3af' }}>
          {stats.fullSongs > 0
            ? `🎵 ${stats.fullSongs} full songs + ${stats.previews} previews`
            : '🎵 30-second previews · Upload MP3 for full songs'}
        </div>
      )}

      <div className="max-h-72 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {results.length === 0 && query && !searching && (
          <div className="text-center py-6 text-sm" style={{ color: '#9ca3af' }}>
            No songs found. Try a different search.
          </div>
        )}

        {results.map((song) => (
          <div
            key={song.id}
            className="flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors hover:bg-purple-50"
            style={{ opacity: song.hasUrl ? 1 : 0.4 }}
            onClick={() => handleAddSong(song)}
          >
            {song.cover ? (
              <img
                src={song.cover}
                alt=""
                className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                style={{ background: '#ede9fe' }}
                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#ede9fe' }}>🎵</div>
            )}

            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: '#1e1b4b' }}>
                {song.name}
              </div>
              <div className="text-xs truncate" style={{ color: '#9ca3af' }}>
                {song.artist} · {formatDuration(song.duration)}
                {song.isPreview && ' · 30s'}
              </div>
            </div>

            {song.hasUrl ? (
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <button
                  className="text-xs font-bold px-3 py-1.5 rounded-lg"
                  style={{
                    background: song.isPreview ? '#8b5cf6' : '#6c5ce7',
                    color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                  onClick={(e) => { e.stopPropagation(); handleAddSong(song); }}>
                  + Add
                </button>
                {!song.isPreview && (
                  <span className="text-xs font-medium" style={{ color: '#10b981' }}>
                    Full song ✓
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs flex-shrink-0 px-2 py-1 rounded"
                style={{ color: '#9ca3af', background: '#f3f4f6' }}>N/A</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}