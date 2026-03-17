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

// ─── SONG SEARCH API (JioSaavn — Full songs, free) ──────────────────────────
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ data: [] });

  try {
    const response = await fetch(
      `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&limit=15`
    );
    const data = await response.json();

    if (!data.success) {
      return res.json({ data: [] });
    }

    const songs = (data.data?.results || []).map((track) => ({
      id: track.id,
      name: track.name,
      artist: track.artists?.primary?.map(a => a.name).join(', ') || 'Unknown',
      album: track.album?.name || 'Unknown',
      duration: track.duration,
      // ✅ Get highest quality download URL
      url: getHighestQualityUrl(track.downloadUrl),
      cover: getHighestQualityCover(track.image),
      year: track.year,
      language: track.language,
    }));

    res.json({ data: songs });
  } catch (err) {
    console.error('Search error:', err);
    res.json({ data: [], error: 'Search failed' });
  }
});

// Get song by ID (for direct links)
app.get('/api/song/:id', async (req, res) => {
  try {
    const response = await fetch(
      `https://saavn.dev/api/songs/${req.params.id}`
    );
    const data = await response.json();

    if (!data.success || !data.data?.[0]) {
      return res.json({ error: 'Song not found' });
    }

    const track = data.data[0];
    res.json({
      id: track.id,
      name: track.name,
      artist: track.artists?.primary?.map(a => a.name).join(', ') || 'Unknown',
      album: track.album?.name || 'Unknown',
      duration: track.duration,
      url: getHighestQualityUrl(track.downloadUrl),
      cover: getHighestQualityCover(track.image),
    });
  } catch (err) {
    console.error('Song fetch error:', err);
    res.json({ error: 'Failed to fetch song' });
  }
});

// Helper: Get highest quality audio URL
function getHighestQualityUrl(downloadUrls) {
  if (!downloadUrls || !Array.isArray(downloadUrls)) return null;
  // Prefer 320kbps > 160kbps > 96kbps > 48kbps > 12kbps
  const qualities = ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps'];
  for (const q of qualities) {
    const match = downloadUrls.find(d => d.quality === q);
    if (match) return match.url;
  }
  return downloadUrls[downloadUrls.length - 1]?.url || null;
}

// Helper: Get highest quality cover image
function getHighestQualityCover(images) {
  if (!images || !Array.isArray(images)) return null;
  const qualities = ['500x500', '150x150', '50x50'];
  for (const q of qualities) {
    const match = images.find(i => i.quality === q);
    if (match) return match.url;
  }
  return images[images.length - 1]?.url || null;
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
});