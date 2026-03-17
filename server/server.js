const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const registerSocketHandlers = require('./socket');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 10000,
});

registerSocketHandlers(io);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ListenTogether',
    timestamp: new Date().toISOString(),
    connectedSockets: io.engine.clientsCount,
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'ListenTogether API running.' });
});

// ══════════════════════════════════════════════════════════════════════════════
//  SONG SEARCH — Deezer API (Free, reliable, no key needed)
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ data: [] });

  console.log(`[Search] Searching: "${query}"`);

  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=25`
    );
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      console.log('[Search] No results');
      return res.json({ data: [] });
    }

    const songs = data.data.map((track) => ({
      id: track.id,
      name: track.title || 'Unknown',
      artist: track.artist?.name || 'Unknown',
      album: track.album?.title || '',
      duration: track.duration || 0,
      url: track.preview || null,
      cover: track.album?.cover_medium || track.album?.cover || null,
      coverBig: track.album?.cover_big || track.album?.cover_medium || null,
      hasUrl: !!track.preview,
      isPreview: true,
    }));

    const available = songs.filter(s => s.hasUrl).length;
    console.log(`[Search] Found ${songs.length} songs, ${available} playable`);

    res.json({ data: songs });
  } catch (err) {
    console.error('[Search] Error:', err.message);
    res.json({ data: [], error: 'Search failed' });
  }
});

// ─── DEBUG ENDPOINT ─────────────────────────────────────────────────────────
app.get('/api/debug-search', async (req, res) => {
  const query = req.query.q || 'Taylor Swift';
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=3`
    );
    const data = await response.json();
    res.json({
      status: 'ok',
      query,
      resultCount: data.data?.length || 0,
      songs: (data.data || []).map(t => ({
        title: t.title,
        artist: t.artist?.name,
        preview: t.preview,
        hasPreview: !!t.preview,
        cover: t.album?.cover_medium,
      })),
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ─── START SERVER ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Song search: Deezer API`);
});