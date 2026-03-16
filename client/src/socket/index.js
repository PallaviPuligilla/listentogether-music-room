// socket/index.js — Singleton Socket.IO client
// All components share the same connection

import { io } from 'socket.io-client';

// Update this to your Render backend URL for production
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const socket = io(SERVER_URL, {
  autoConnect: false, // We manually connect after user enters room
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;