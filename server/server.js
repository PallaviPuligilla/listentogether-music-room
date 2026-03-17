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
//  SONG SEARCH — Multiple sources for FULL songs + Deezer fallback
// ══════════════════════════════════════════════════════════════════════════════

// Community-hosted JioSaavn APIs (they handle decryption for us!)
const JIOSAAVN_APIS = [
  'https://jiosaavn-api-privatecvc2.vercel.app',
  'https://jio-savaan-private.vercel.app',
  'https://saavn.me',
  'https://jiosaavn-api-ts.vercel.app',
];

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]*>/g, '')
    .trim();
}

// ── Extract download URL from various API response formats ──
function extractDownloadUrl(track) {
  // Format 1: downloadUrl array
  if (track.downloadUrl && Array.isArray(track.downloadUrl)) {
    const qualities = ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps'];
    for (const q of qualities) {
      const match = track.downloadUrl.find(d =>
        d.quality === q || d.quality === q.replace('kbps', '')
      );
      if (match?.url || match?.link) return match.url || match.link;
    }
    const last = track.downloadUrl[track.downloadUrl.length - 1];
    if (last?.url || last?.link) return last.url || last.link;
  }

  // Format 2: downloadUrl string
  if (typeof track.downloadUrl === 'string' && track.downloadUrl.startsWith('http')) {
    return track.downloadUrl;
  }

  // Format 3: download_url
  if (track.download_url) return track.download_url;

  // Format 4: media_url
  if (track.media_url) return track.media_url;

  // Format 5: url
  if (track.url && typeof track.url === 'string' && track.url.includes('saavn')) {
    return track.url;
  }

  // Format 6: media_preview_url (still better than nothing)
  if (track.media_preview_url) return track.media_preview_url;

  return null;
}

// ── Extract cover image from various formats ──
function extractCover(track) {
  if (track.image) {
    if (Array.isArray(track.image)) {
      const best = track.image.find(i => i.quality === '500x500') ||
                   track.image[track.image.length - 1];
      const url = best?.url || best?.link;
      if (url) return url;
    }
    if (typeof track.image === 'string') {
      return track.image.replace('50x50', '500x500').replace('150x150', '500x500');
    }
  }
  if (track.album?.image) {
    if (Array.isArray(track.album.image)) {
      const best = track.album.image[track.album.image.length - 1];
      return best?.url || best?.link || null;
    }
    return track.album.image;
  }
  return null;
}

// ── Extract artist from various formats ──
function extractArtist(track) {
  if (track.artists?.primary && Array.isArray(track.artists.primary)) {
    return track.artists.primary.map(a => cleanText(a.name || a)).slice(0, 3).join(', ');
  }
  if (track.artists?.all && Array.isArray(track.artists.all)) {
    return track.artists.all.map(a => cleanText(a.name || a)).slice(0, 3).join(', ');
  }
  if (track.primaryArtists) return cleanText(track.primaryArtists);
  if (track.primary_artists) return cleanText(track.primary_artists);
  if (track.artist) return cleanText(typeof track.artist === 'object' ? track.artist.name : track.artist);
  if (track.singers) return cleanText(track.singers);
  if (track.music) return cleanText(track.music);
  return 'Unknown Artist';
}

// ── Try each JioSaavn community API ──
async function searchJioSaavn(query) {
  for (let i = 0; i < JIOSAAVN_APIS.length; i++) {
    const baseUrl = JIOSAAVN_APIS[i];

    // Try multiple search endpoint formats
    const endpoints = [
      `${baseUrl}/api/search/songs?query=${encodeURIComponent(query)}&limit=20`,
      `${baseUrl}/search/songs?query=${encodeURIComponent(query)}&limit=20`,
      `${baseUrl}/api/search?query=${encodeURIComponent(query)}&limit=20`,
      `${baseUrl}/result/?query=${encodeURIComponent(query)}`,
    ];

    for (let j = 0; j < endpoints.length; j++) {
      try {
        console.log(`[JioSaavn] Trying API ${i + 1}, endpoint ${j + 1}...`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(endpoints[j], {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });

        clearTimeout(timeout);

        if (!response.ok) continue;

        const data = await response.json();

        // Find results in various response structures
        let results = [];
        if (data.data?.results && Array.isArray(data.data.results)) {
          results = data.data.results;
        } else if (data.results && Array.isArray(data.results)) {
          results = data.results;
        } else if (data.data && Array.isArray(data.data)) {
          results = data.data;
        } else if (Array.isArray(data)) {
          results = data;
        }

        if (results.length === 0) continue;

        console.log(`[JioSaavn] ✅ API ${i + 1} endpoint ${j + 1} worked! ${results.length} results`);

        const songs = results.map((track) => {
          const downloadUrl = extractDownloadUrl(track);

          return {
            id: track.id || Math.random().toString(36).substr(2),
            name: cleanText(track.name || track.title || track.song || 'Unknown'),
            artist: extractArtist(track),
            album: cleanText(track.album?.name || track.album?.title || track.album || ''),
            duration: parseInt(track.duration || 0),
            url: downloadUrl,
            cover: extractCover(track),
            hasUrl: !!downloadUrl,
            source: 'jiosaavn',
            isPreview: false,
          };
        });

        const available = songs.filter(s => s.hasUrl).length;
        console.log(`[JioSaavn] ${available}/${songs.length} have download URLs`);

        if (available > 0) return songs;

      } catch (err) {
        // Silently continue to next endpoint
      }
    }
  }

  console.log('[JioSaavn] All APIs failed');
  return [];
}

// ── Deezer Search (30s previews — always reliable) ──
async function searchDeezer(query) {
  try {
    console.log('[Deezer] Searching...');
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=25`
    );
    const data = await response.json();

    if (!data.data || data.data.length === 0) return [];

    console.log(`[Deezer] Found ${data.data.length} results`);

    return data.data.map((track) => ({
      id: 'dz-' + track.id,
      name: track.title || 'Unknown',
      artist: track.artist?.name || 'Unknown',
      album: track.album?.title || '',
      duration: track.duration || 0,
      url: track.preview || null,
      cover: track.album?.cover_medium || null,
      hasUrl: !!track.preview,
      source: 'deezer',
      isPreview: true,
    }));
  } catch (err) {
    console.error('[Deezer] Error:', err.message);
    return [];
  }
}

// ─── MAIN SEARCH ENDPOINT ─────────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ data: [] });

  console.log(`\n[Search] ===== "${query}" =====`);

  // Search both at the same time
  const [jiosaavnResults, deezerResults] = await Promise.all([
    searchJioSaavn(query),
    searchDeezer(query),
  ]);

  const jiosaavnWorking = jiosaavnResults.filter(s => s.hasUrl);
  const deezerWorking = deezerResults.filter(s => s.hasUrl);

  // Combine: Full songs first, then previews
  let combined = [];

  // Add JioSaavn full songs
  for (const song of jiosaavnWorking) {
    combined.push(song);
  }

  // Add Deezer previews (skip duplicates)
  for (const dz of deezerWorking) {
    const isDuplicate = combined.some(
      s => s.name.toLowerCase().includes(dz.name.toLowerCase().substring(0, 10)) &&
           s.artist.toLowerCase().includes(dz.artist.toLowerCase().substring(0, 5))
    );
    if (!isDuplicate) {
      combined.push(dz);
    }
  }

  // If no JioSaavn, use all Deezer
  if (combined.length === 0) {
    combined = deezerWorking;
  }

  const fullSongs = combined.filter(s => !s.isPreview).length;
  const previews = combined.filter(s => s.isPreview).length;

  console.log(`[Search] Final: ${combined.length} total (${fullSongs} full + ${previews} previews)`);

  res.json({
    data: combined,
    stats: { total: combined.length, fullSongs, previews },
  });
});

// ─── DEBUG ENDPOINT ─────────────────────────────────────────────────────────
app.get('/api/debug-search', async (req, res) => {
  const query = req.query.q || 'Arijit Singh';
  const debug = { query, timestamp: new Date().toISOString() };

  // Test each JioSaavn API
  debug.jiosaavn_apis = {};
  for (let i = 0; i < JIOSAAVN_APIS.length; i++) {
    const baseUrl = JIOSAAVN_APIS[i];
    const endpoint = `${baseUrl}/api/search/songs?query=${encodeURIComponent(query)}&limit=2`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      clearTimeout(timeout);

      const data = await response.json();
      const results = data.data?.results || data.results || data.data || [];
      const first = Array.isArray(results) ? results[0] : null;

      debug.jiosaavn_apis[baseUrl] = {
        status: response.status,
        resultCount: Array.isArray(results) ? results.length : 0,
        firstSong: first ? {
          name: first.name || first.title,
          hasDownloadUrl: !!extractDownloadUrl(first),
          downloadUrl: extractDownloadUrl(first)?.substring(0, 80),
        } : null,
      };
    } catch (err) {
      debug.jiosaavn_apis[baseUrl] = { error: err.message };
    }
  }

  // Test Deezer
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=2`
    );
    const data = await response.json();
    const first = data.data?.[0];
    debug.deezer = {
      works: !!first?.preview,
      title: first?.title,
      artist: first?.artist?.name,
      previewUrl: first?.preview?.substring(0, 60),
    };
  } catch (err) {
    debug.deezer = { error: err.message };
  }

  res.json(debug);
});

// ─── START SERVER ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Song search: JioSaavn APIs + Deezer fallback`);
});