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
  res.json({ message: 'ListenTogether API running. Connect via Socket.IO.' });
});

// ─── SONG SEARCH API (Deezer — Free, no key needed) ─────────────────────────
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.json({ data: [] });
  }

  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=15`
    );
    const data = await response.json();

    const songs = (data.data || []).map((track) => ({
      id: track.id,
      name: track.title,
      artist: track.artist?.name || 'Unknown Artist',
      album: track.album?.title || 'Unknown Album',
      duration: track.duration,
      preview: track.preview,
      cover: track.album?.cover_medium || track.album?.cover,
    }));

    res.json({ data: songs });
  } catch (err) {
    console.error('Search error:', err);
    res.json({ data: [], error: 'Search failed' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
});