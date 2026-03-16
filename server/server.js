// server.js — ListenTogether Express + Socket.IO server

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const registerSocketHandlers = require('./socket');

const app = express();
const server = http.createServer(app);

// ─── CORS ──────────────────────────────────────────────────────────────────────
// ✅ FIX: Allow BOTH localhost AND your deployed Vercel URL
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,       // ← Set this on Render!
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    // ✅ In development, allow all. In production, you can tighten this.
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());

// ─── SOCKET.IO ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      callback(null, true); // ✅ Allow all origins for Socket.IO
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // ✅ FIX: Allow both transports (some networks block websocket)
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 10000,
});

// Register all socket event handlers
registerSocketHandlers(io);

// ─── REST ENDPOINTS ────────────────────────────────────────────────────────────

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

// ─── START SERVER ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
});