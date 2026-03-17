const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');
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

// ─── HEALTH & ROOT ──────────────────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════════════════════
//  JIOSAAVN SONG SEARCH — Built-in, no external API dependency!
//  Directly calls JioSaavn's internal API and decrypts download URLs
// ══════════════════════════════════════════════════════════════════════════════

const JIOSAAVN_API = 'https://www.jiosaavn.com/api.php';

// ── Decrypt JioSaavn's encrypted media URL ──
function decryptMediaUrl(encryptedUrl) {
  if (!encryptedUrl) return null;
  try {
    const key = '38346591';
    const decipher = crypto.createDecipheriv('des-ecb', Buffer.from(key, 'utf8'), null);
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(encryptedUrl, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    // Upgrade to 320kbps (highest quality)
    return decrypted
      .replace('_96.mp4', '_320.mp4')
      .replace('_96.', '_320.')
      .replace('http:', 'https:');
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return null;
  }
}

// ── Clean HTML entities from JioSaavn text ──
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]*>/g, '')  // Remove HTML tags
    .trim();
}

// ── Extract artist names ──
function getArtists(track) {
  if (track.more_info?.artistMap?.primary_artists) {
    return track.more_info.artistMap.primary_artists
      .map(a => cleanText(a.name))
      .slice(0, 3)
      .join(', ');
  }
  if (track.primary_artists) return cleanText(track.primary_artists);
  if (track.more_info?.music) return cleanText(track.more_info.music);
  if (track.more_info?.singers) return cleanText(track.more_info.singers);
  return 'Unknown Artist';
}

// ── Get highest quality cover image ──
function getCover(imageUrl) {
  if (!imageUrl) return null;
  return imageUrl
    .replace('50x50', '500x500')
    .replace('150x150', '500x500')
    .replace('http:', 'https:');
}

// ─── SEARCH ENDPOINT ────────────────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ data: [] });

  try {
    const url = `${JIOSAAVN_API}?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(query)}&p=1&n=20`;

    console.log(`[Search] Searching for: "${query}"`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
      },
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('[Search] Invalid JSON response');
      return res.json({ data: [], error: 'Invalid response from music service' });
    }

    const results = data.results || data.data?.results || [];

    const songs = results.map((track) => {
      const encryptedUrl = track.more_info?.encrypted_media_url;
      const downloadUrl = decryptMediaUrl(encryptedUrl);

      return {
        id: track.id,
        name: cleanText(track.title || track.song || track.name || 'Unknown'),
        artist: getArtists(track),
        album: cleanText(track.more_info?.album || track.album || ''),
        duration: parseInt(track.more_info?.duration || track.duration || 0),
        url: downloadUrl,
        cover: getCover(track.image),
        year: track.year || track.more_info?.year || '',
        language: cleanText(track.language || track.more_info?.language || ''),
        hasUrl: !!downloadUrl,
      };
    });

    const available = songs.filter(s => s.hasUrl).length;
    console.log(`[Search] Found ${songs.length} songs, ${available} available for streaming`);

    res.json({ data: songs });
  } catch (err) {
    console.error('[Search] Error:', err.message);
    res.json({ data: [], error: 'Search failed' });
  }
});

// ─── GET SONG BY ID ─────────────────────────────────────────────────────────
app.get('/api/song/:id', async (req, res) => {
  try {
    const url = `${JIOSAAVN_API}?__call=song.getDetails&cc=in&_marker=0%3F_marker%3D0&_format=json&pids=${req.params.id}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const data = await response.json();
    const track = Object.values(data)[0];

    if (!track) {
      return res.json({ error: 'Song not found' });
    }

    const downloadUrl = decryptMediaUrl(track.more_info?.encrypted_media_url);

    res.json({
      id: track.id,
      name: cleanText(track.title || track.song),
      artist: getArtists(track),
      album: cleanText(track.more_info?.album || ''),
      duration: parseInt(track.more_info?.duration || 0),
      url: downloadUrl,
      cover: getCover(track.image),
    });
  } catch (err) {
    console.error('[Song] Error:', err.message);
    res.json({ error: 'Failed to fetch song' });
  }
});

// ─── DEBUG ENDPOINT ─────────────────────────────────────────────────────────
app.get('/api/debug-search', async (req, res) => {
  const query = req.query.q || 'Taylor Swift';
  try {
    const url = `${JIOSAAVN_API}?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(query)}&p=1&n=2`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const data = await response.json();
    const firstResult = data.results?.[0];

    // Show what we get and what we decrypt
    const debugInfo = {
      raw_first_result: firstResult,
      encrypted_url: firstResult?.more_info?.encrypted_media_url || 'NOT FOUND',
      decrypted_url: firstResult?.more_info?.encrypted_media_url
        ? decryptMediaUrl(firstResult.more_info.encrypted_media_url)
        : 'NOTHING TO DECRYPT',
      total_results: data.results?.length || 0,
    };

    res.json(debugInfo);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ─── START SERVER ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`✅ Song search: Built-in JioSaavn API`);
});