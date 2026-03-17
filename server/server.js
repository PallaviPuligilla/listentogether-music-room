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

// ─── SONG SEARCH API (JioSaavn — Full songs, free) ──────────────────────────
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ data: [] });

  try {
    const response = await fetch(
      `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&limit=15`
    );
    const data = await response.json();

    // ✅ DEBUG: Log to see actual response structure
    if (data.data?.results?.[0]) {
      console.log('🔍 Sample song response:', JSON.stringify(data.data.results[0], null, 2));
    }

    if (!data.success) {
      return res.json({ data: [] });
    }

    const songs = (data.data?.results || []).map((track) => {
      const songUrl = extractUrl(track.downloadUrl) || extractUrl(track.url);
      const coverUrl = extractCover(track.image);

      return {
        id: track.id,
        name: track.name || track.title || 'Unknown',
        artist: extractArtists(track),
        album: track.album?.name || track.album || 'Unknown',
        duration: track.duration,
        url: songUrl,
        cover: coverUrl,
        year: track.year,
        language: track.language,
        hasUrl: !!songUrl,  // ✅ Tell frontend if URL exists
      };
    });

    res.json({ data: songs });
  } catch (err) {
    console.error('Search error:', err);
    res.json({ data: [], error: 'Search failed' });
  }
});

// ✅ Debug endpoint — check what the API returns
app.get('/api/debug-search', async (req, res) => {
  const query = req.query.q || 'Taylor Swift';
  try {
    const response = await fetch(
      `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&limit=1`
    );
    const data = await response.json();
    res.json(data); // Return raw response
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Get song by ID
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
      name: track.name || track.title,
      artist: extractArtists(track),
      album: track.album?.name || track.album || 'Unknown',
      duration: track.duration,
      url: extractUrl(track.downloadUrl) || extractUrl(track.url),
      cover: extractCover(track.image),
    });
  } catch (err) {
    console.error('Song fetch error:', err);
    res.json({ error: 'Failed to fetch song' });
  }
});

// ══════════════════════════════════════════════════
//  HELPER FUNCTIONS — Handle all possible formats
// ══════════════════════════════════════════════════

function extractUrl(downloadUrl) {
  if (!downloadUrl) return null;

  // Format 1: Direct string URL
  if (typeof downloadUrl === 'string') {
    return downloadUrl;
  }

  // Format 2: Array of { quality, url }
  if (Array.isArray(downloadUrl)) {
    const qualities = ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps'];
    for (const q of qualities) {
      const match = downloadUrl.find(d =>
        d.quality === q || d.quality === q.replace('kbps', '')
      );
      if (match) {
        return match.url || match.link || match.download_url || null;
      }
    }
    // Just return the last (usually highest quality)
    const last = downloadUrl[downloadUrl.length - 1];
    if (last) {
      return last.url || last.link || last.download_url || null;
    }
  }

  // Format 3: Object with quality keys
  if (typeof downloadUrl === 'object' && !Array.isArray(downloadUrl)) {
    return downloadUrl['320kbps'] ||
           downloadUrl['160kbps'] ||
           downloadUrl['96kbps'] ||
           downloadUrl['48kbps'] ||
           downloadUrl['12kbps'] ||
           Object.values(downloadUrl)[0] ||
           null;
  }

  return null;
}

function extractCover(image) {
  if (!image) return null;

  // Direct string URL
  if (typeof image === 'string') {
    // Replace low quality with high quality
    return image.replace('50x50', '500x500').replace('150x150', '500x500');
  }

  // Array of { quality, url }
  if (Array.isArray(image)) {
    const qualities = ['500x500', '150x150', '50x50'];
    for (const q of qualities) {
      const match = image.find(i => i.quality === q);
      if (match) return match.url || match.link || null;
    }
    const last = image[image.length - 1];
    return last?.url || last?.link || null;
  }

  return null;
}

function extractArtists(track) {
  // Format 1: track.artists.primary (array)
  if (track.artists?.primary && Array.isArray(track.artists.primary)) {
    return track.artists.primary.map(a => a.name).join(', ');
  }

  // Format 2: track.artists.all (array)
  if (track.artists?.all && Array.isArray(track.artists.all)) {
    return track.artists.all.slice(0, 3).map(a => a.name).join(', ');
  }

  // Format 3: track.primaryArtists (string)
  if (track.primaryArtists) {
    return track.primaryArtists;
  }

  // Format 4: track.music (string)
  if (track.music) {
    return track.music;
  }

  return 'Unknown Artist';
}

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