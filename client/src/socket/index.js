// socket/index.js — Singleton Socket.IO client

import { io } from 'socket.io-client';

// ✅ FIX: Must set VITE_SERVER_URL on Vercel!
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// ✅ Debug log — check browser console to verify correct URL
console.log('🔌 Socket connecting to:', SERVER_URL);

const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,        // ✅ Increased from 5
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],  // ✅ Added: try websocket first, fallback to polling
});

// ✅ Debug listeners
socket.on('connect', () => {
  console.log('✅ Socket connected! ID:', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('❌ Socket connection error:', err.message);
});

socket.on('disconnect', (reason) => {
  console.log('⚠️ Socket disconnected:', reason);
});

export default socket;