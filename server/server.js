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
//  SONG SEARCH — Tries multiple sources
// ══════════════════════════════════════════════════════════════════════════════

// JioSaavn DES decryption key
function decryptUrl(encryptedUrl) {
  if (!encryptedUrl) return null;
  try {
    const key = '38346591';
    const decipher = crypto.createDecipheriv('des-ecb', Buffer.from(key, 'utf8'), null);
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(encryptedUrl, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted
      .replace('_96.mp4', '_320.mp4')
      .replace('_96.', '_320.')
      .replace('http:', 'https:');
  } catch (err) {
    return null;
  }
}

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

// ── Try JioSaavn with multiple URL formats ──
async function searchJioSaavn(query) {
  const urls = [
    // Format 1 — api_version=4 with ctx
    `https://www.jiosaavn.com/api.php?p=1&q=${encodeURIComponent(query)}&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=20&__call=search.getResults`,
    // Format 2 — simple
    `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(query)}&p=1&n=20`,
    // Format 3 — autocomplete
    `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(query)}`,
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
    'Referer': 'https://www.jiosaavn.com/',
    'Origin': 'https://www.jiosaavn.com',
    'Cookie': 'L=english; geo=in',
  };

  for (let i = 0; i < urls.length; i++) {
    try {
      console.log(`[JioSaavn] Trying format ${i + 1}...`);
      const response = await fetch(urls[i], { headers });
      const text = await response.text();
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.log(`[JioSaavn] Format ${i + 1}: Not JSON`);
        continue;
      }

      // Handle different response structures
      let results = [];
      
      if (data.results && Array.isArray(data.results)) {
        results = data.results;
      } else if (data.data?.results && Array.isArray(data.data.results)) {
        results = data.data.results;
      } else if (data.songs?.data && Array.isArray(data.songs.data)) {
        results = data.songs.data;
      }

      if (results.length > 0) {
        console.log(`[JioSaavn] Format ${i + 1} worked! Found ${results.length} results`);
        
        const songs = results.map((track) => {
          const encrypted = track.more_info?.encrypted_media_url || 
                          track.encrypted_media_url;
          const downloadUrl = decryptUrl(encrypted);

          // Get artist
          let artist = 'Unknown';
          if (track.more_info?.artistMap?.primary_artists) {
            artist = track.more_info.artistMap.primary_artists.map(a => cleanText(a.name)).slice(0, 3).join(', ');
          } else if (track.primary_artists) {
            artist = cleanText(track.primary_artists);
          } else if (track.more_info?.singers) {
            artist = cleanText(track.more_info.singers);
          }

          // Get cover
          let cover = track.image || track.more_info?.image || '';
          if (typeof cover === 'string') {
            cover = cover.replace('50x50', '500x500').replace('150x150', '500x500').replace('http:', 'https:');
          }

          return {
            id: track.id,
            name: cleanText(track.title || track.song || track.name || 'Unknown'),
            artist,
            album: cleanText(track.more_info?.album || track.album || ''),
            duration: parseInt(track.more_info?.duration || track.duration || 0),
            url: downloadUrl,
            cover,
            year: track.year || '',
            language: cleanText(track.language || ''),
            hasUrl: !!downloadUrl,
            source: 'jiosaavn',
          };
        });

        return songs;
      }

      console.log(`[JioSaavn] Format ${i + 1}: 0 results`);
    } catch (err) {
      console.log(`[JioSaavn] Format ${i + 1} failed:`, err.message);
    }
  }

  return []; // All formats failed
}

// ── Deezer search (30s previews — always works as backup) ──
async function searchDeezer(query) {
  try {
    console.log('[Deezer] Searching as backup...');
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=15`
    );
    const data = await response.json();

    if (!data.data || data.data.length === 0) return [];

    return data.data.map((track) => ({
      id: 'dz-' + track.id,
      name: track.title || 'Unknown',
      artist: track.artist?.name || 'Unknown',
      album: track.album?.title || '',
      duration: track.duration || 0,
      url: track.preview || null,
      cover: track.album?.cover_medium || track.album?.cover || null,
      year: '',
      language: '',
      hasUrl: !!track.preview,
      source: 'deezer',
      isPreview: true,
    }));
  } catch (err) {
    console.log('[Deezer] Failed:', err.message);
    return [];
  }
}

// ─── MAIN SEARCH ENDPOINT ─────────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ data: [] });

  console.log(`\n[Search] ========== Searching: "${query}" ==========`);

  // Try JioSaavn first (full songs)
  let songs = await searchJioSaavn(query);

  let source = 'jiosaavn';

  // If JioSaavn failed, try Deezer (30s previews)
  if (songs.length === 0) {
    console.log('[Search] JioSaavn returned 0 results, trying Deezer...');
    songs = await searchDeezer(query);
    source = 'deezer';
  }

  const available = songs.filter(s => s.hasUrl).length;
  console.log(`[Search] Final: ${songs.length} songs found (${available} streamable) from ${source}`);

  res.json({ data: songs, source });
});

// ─── DEBUG ENDPOINT — Shows raw API responses ──────────────────────────────
app.get('/api/debug-search', async (req, res) => {
  const query = req.query.q || 'Arijit Singh';

  const debug = {
    query,
    timestamp: new Date().toISOString(),
    jiosaavn: {},
    deezer: {},
  };

  // Test JioSaavn formats
  const jiosaavnUrls = [
    {
      name: 'format1_api_v4',
      url: `https://www.jiosaavn.com/api.php?p=1&q=${encodeURIComponent(query)}&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=2&__call=search.getResults`,
    },
    {
      name: 'format2_simple',
      url: `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(query)}&p=1&n=2`,
    },
    {
      name: 'format3_autocomplete',
      url: `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(query)}`,
    },
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Referer': 'https://www.jiosaavn.com/',
    'Origin': 'https://www.jiosaavn.com',
    'Cookie': 'L=english; geo=in',
  };

  for (const item of jiosaavnUrls) {
    try {
      const response = await fetch(item.url, { headers });
      const text = await response.text();
      const status = response.status;

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        parsed = { raw_text_first_500: text.substring(0, 500), parse_error: true };
      }

      // Count results
      let resultCount = 0;
      if (parsed.results) resultCount = Array.isArray(parsed.results) ? parsed.results.length : Object.keys(parsed.results).length;
      if (parsed.data?.results) resultCount = parsed.data.results.length;
      if (parsed.songs?.data) resultCount = parsed.songs.data.length;

      // Check for encrypted URL in first result
      let firstResult = null;
      if (Array.isArray(parsed.results) && parsed.results[0]) {
        firstResult = {
          title: parsed.results[0].title || parsed.results[0].song,
          has_encrypted_url: !!parsed.results[0].more_info?.encrypted_media_url,
          encrypted_url_preview: parsed.results[0].more_info?.encrypted_media_url?.substring(0, 50),
          decrypted_url: decryptUrl(parsed.results[0].more_info?.encrypted_media_url),
        };
      }

      debug.jiosaavn[item.name] = {
        status,
        result_count: resultCount,
        response_keys: Object.keys(parsed),
        first_result: firstResult,
      };
    } catch (err) {
      debug.jiosaavn[item.name] = { error: err.message };
    }
  }

  // Test Deezer
  try {
    const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=2`);
    const data = await response.json();
    debug.deezer = {
      status: response.status,
      result_count: data.data?.length || 0,
      first_result: data.data?.[0] ? {
        title: data.data[0].title,
        artist: data.data[0].artist?.name,
        preview_url: data.data[0].preview,
        has_preview: !!data.data[0].preview,
      } : null,
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
  console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`✅ Song search: JioSaavn + Deezer fallback`);
});