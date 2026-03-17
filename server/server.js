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
//  JIOSAAVN DECRYPTION — Fixed with multiple approaches
// ══════════════════════════════════════════════════════════════════════════════

function decryptUrl(encryptedUrl) {
  if (!encryptedUrl) return null;

  const key = '38346591';

  // Approach 1: createDecipheriv with null IV
  try {
    const decipher = crypto.createDecipheriv(
      'des-ecb',
      Buffer.from(key, 'utf8'),
      null
    );
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(encryptedUrl, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    const url = decrypted
      .replace(/_96\.mp4/g, '_320.mp4')
      .replace(/_96_/g, '_320_')
      .replace(/http:/g, 'https:');
    console.log('[Decrypt] Approach 1 SUCCESS');
    return url;
  } catch (e1) {
    console.log('[Decrypt] Approach 1 failed:', e1.message);
  }

  // Approach 2: createDecipheriv with empty Buffer IV
  try {
    const decipher = crypto.createDecipheriv(
      'des-ecb',
      Buffer.from(key, 'utf8'),
      Buffer.alloc(0)
    );
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(encryptedUrl, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    const url = decrypted
      .replace(/_96\.mp4/g, '_320.mp4')
      .replace(/_96_/g, '_320_')
      .replace(/http:/g, 'https:');
    console.log('[Decrypt] Approach 2 SUCCESS');
    return url;
  } catch (e2) {
    console.log('[Decrypt] Approach 2 failed:', e2.message);
  }

  // Approach 3: createDecipheriv with '' IV
  try {
    const decipher = crypto.createDecipheriv(
      'des-ecb',
      Buffer.from(key, 'utf8'),
      ''
    );
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(encryptedUrl, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    const url = decrypted
      .replace(/_96\.mp4/g, '_320.mp4')
      .replace(/_96_/g, '_320_')
      .replace(/http:/g, 'https:');
    console.log('[Decrypt] Approach 3 SUCCESS');
    return url;
  } catch (e3) {
    console.log('[Decrypt] Approach 3 failed:', e3.message);
  }

  // Approach 4: Legacy createDecipher (deprecated but works on some Node versions)
  try {
    const decipher = crypto.createDecipher('des-ecb', key);
    let decrypted = decipher.update(encryptedUrl, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    const url = decrypted
      .replace(/_96\.mp4/g, '_320.mp4')
      .replace(/_96_/g, '_320_')
      .replace(/http:/g, 'https:');
    console.log('[Decrypt] Approach 4 (legacy) SUCCESS');
    return url;
  } catch (e4) {
    console.log('[Decrypt] Approach 4 failed:', e4.message);
  }

  console.log('[Decrypt] ALL approaches failed for:', encryptedUrl.substring(0, 30));
  return null;
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

// ══════════════════════════════════════════════════════════════════════════════
//  SEARCH — JioSaavn (full songs) + Deezer (30s preview backup)
// ══════════════════════════════════════════════════════════════════════════════

// ── JioSaavn Search ──
async function searchJioSaavn(query) {
  try {
    const url = `https://www.jiosaavn.com/api.php?p=1&q=${encodeURIComponent(query)}&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=20&__call=search.getResults`;

    console.log('[JioSaavn] Searching...');

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.jiosaavn.com/',
        'Origin': 'https://www.jiosaavn.com',
        'Cookie': 'L=english; geo=in',
      },
    });

    const data = await response.json();
    const results = data.results || [];

    if (results.length === 0) {
      console.log('[JioSaavn] No results');
      return [];
    }

    console.log(`[JioSaavn] Found ${results.length} results, decrypting...`);

    const songs = results.map((track) => {
      const encrypted = track.more_info?.encrypted_media_url;
      const downloadUrl = decryptUrl(encrypted);

      let artist = 'Unknown';
      if (track.more_info?.artistMap?.primary_artists) {
        artist = track.more_info.artistMap.primary_artists
          .map(a => cleanText(a.name))
          .slice(0, 3)
          .join(', ');
      } else if (track.primary_artists) {
        artist = cleanText(track.primary_artists);
      } else if (track.more_info?.singers) {
        artist = cleanText(track.more_info.singers);
      }

      let cover = track.image || '';
      if (typeof cover === 'string') {
        cover = cover
          .replace('50x50', '500x500')
          .replace('150x150', '500x500')
          .replace('http:', 'https:');
      }

      return {
        id: track.id,
        name: cleanText(track.title || track.song || 'Unknown'),
        artist,
        album: cleanText(track.more_info?.album || ''),
        duration: parseInt(track.more_info?.duration || 0),
        url: downloadUrl,
        cover,
        hasUrl: !!downloadUrl,
        source: 'jiosaavn',
        isPreview: false,
      };
    });

    const available = songs.filter(s => s.hasUrl).length;
    console.log(`[JioSaavn] ${available}/${songs.length} songs have working URLs`);

    return songs;
  } catch (err) {
    console.error('[JioSaavn] Error:', err.message);
    return [];
  }
}

// ── Deezer Search (30s previews — always works) ──
async function searchDeezer(query) {
  try {
    console.log('[Deezer] Searching...');
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=20`
    );
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      console.log('[Deezer] No results');
      return [];
    }

    console.log(`[Deezer] Found ${data.data.length} results`);

    return data.data.map((track) => ({
      id: 'dz-' + track.id,
      name: track.title || 'Unknown',
      artist: track.artist?.name || 'Unknown',
      album: track.album?.title || '',
      duration: track.duration || 0,
      url: track.preview || null,
      cover: track.album?.cover_medium || track.album?.cover || null,
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

  // Search both sources at the same time
  const [jiosaavnResults, deezerResults] = await Promise.all([
    searchJioSaavn(query),
    searchDeezer(query),
  ]);

  // Separate JioSaavn results: working vs not working
  const jiosaavnWorking = jiosaavnResults.filter(s => s.hasUrl);

  // Combine: JioSaavn full songs first, then Deezer previews
  let combined = [];

  if (jiosaavnWorking.length > 0) {
    // JioSaavn decryption worked! Use full songs
    combined = jiosaavnWorking;
    console.log(`[Search] Using ${jiosaavnWorking.length} JioSaavn full songs`);
  }

  // Always add Deezer results that aren't duplicates
  for (const dz of deezerResults) {
    const isDuplicate = combined.some(
      s => s.name.toLowerCase() === dz.name.toLowerCase() &&
           s.artist.toLowerCase() === dz.artist.toLowerCase()
    );
    if (!isDuplicate && dz.hasUrl) {
      combined.push(dz);
    }
  }

  // If still nothing, show all Deezer results
  if (combined.length === 0) {
    combined = deezerResults.filter(s => s.hasUrl);
  }

  const source = jiosaavnWorking.length > 0 ? 'jiosaavn' : 'deezer';
  console.log(`[Search] Final: ${combined.length} songs (source: ${source})`);

  res.json({ data: combined, source });
});

// ─── DEBUG ENDPOINT ─────────────────────────────────────────────────────────
app.get('/api/debug-search', async (req, res) => {
  const query = req.query.q || 'Arijit Singh';

  const debug = { query, timestamp: new Date().toISOString() };

  // Test JioSaavn
  try {
    const url = `https://www.jiosaavn.com/api.php?p=1&q=${encodeURIComponent(query)}&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=2&__call=search.getResults`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.jiosaavn.com/',
        'Cookie': 'L=english; geo=in',
      },
    });
    const data = await response.json();
    const first = data.results?.[0];

    if (first) {
      const encrypted = first.more_info?.encrypted_media_url;
      debug.jiosaavn = {
        found: true,
        title: first.title,
        encrypted_url_length: encrypted?.length || 0,
        encrypted_url_preview: encrypted?.substring(0, 60),
        decrypted_url: decryptUrl(encrypted),
        node_version: process.version,
      };
    } else {
      debug.jiosaavn = { found: false };
    }
  } catch (err) {
    debug.jiosaavn = { error: err.message };
  }

  // Test Deezer
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=2`
    );
    const data = await response.json();
    const first = data.data?.[0];

    debug.deezer = {
      found: !!first,
      title: first?.title,
      artist: first?.artist?.name,
      preview_url: first?.preview,
      works: !!first?.preview,
    };
  } catch (err) {
    debug.deezer = { error: err.message };
  }

  // Test decryption with known test string
  debug.decryption_test = {
    node_version: process.version,
    crypto_available: !!crypto.createDecipheriv,
  };

  try {
    const testDecipher = crypto.createDecipheriv(
      'des-ecb',
      Buffer.from('38346591', 'utf8'),
      null
    );
    debug.decryption_test.null_iv = 'works';
  } catch (e) {
    debug.decryption_test.null_iv = e.message;
  }

  try {
    const testDecipher = crypto.createDecipheriv(
      'des-ecb',
      Buffer.from('38346591', 'utf8'),
      Buffer.alloc(0)
    );
    debug.decryption_test.empty_buffer_iv = 'works';
  } catch (e) {
    debug.decryption_test.empty_buffer_iv = e.message;
  }

  try {
    const testDecipher = crypto.createDecipheriv(
      'des-ecb',
      Buffer.from('38346591', 'utf8'),
      ''
    );
    debug.decryption_test.empty_string_iv = 'works';
  } catch (e) {
    debug.decryption_test.empty_string_iv = e.message;
  }

  res.json(debug);
});

// ─── START SERVER ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Node version: ${process.version}`);
  console.log(`✅ Song search: JioSaavn + Deezer`);
});