// server.js — ListenTogether Express + Socket.IO server

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const registerSocketHandlers = require('./socket');

const app = express();
const server = http.createServer(app);

// ─── CORS ──────────────────────────────────────────────────────────────────────
// Update FRONTEND_URL for production deployment
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

// ─── SOCKET.IO ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Increase ping timeout for poor connections (e.g. mobile)
  pingTimeout: 30000,
  pingInterval: 10000,
});

// Register all socket event handlers
registerSocketHandlers(io);

// ─── REST ENDPOINTS ────────────────────────────────────────────────────────────

// Health check — used by Render to verify the server is running
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ListenTogether', timestamp: new Date().toISOString() });
});

// Root
app.get('/', (req, res) => {
  res.json({ message: 'ListenTogether API running. Connect via Socket.IO.' });
});

// ─── START SERVER ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});