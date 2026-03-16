// socket.js — All Socket.IO event handlers for ListenTogether

const {
  createRoom,
  getRoom,
  addParticipant,
  removeParticipant,
  addSong,
  removeSong,
  updatePlayback,
  getLiveCurrentTime,
  isHost,
} = require('./roomManager');

module.exports = function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // Track which room this socket is in (for disconnect cleanup)
    let currentRoomId = null;
    let currentUserName = null;

    // ─── ROOM EVENTS ───────────────────────────────────────────────────────────

    /**
     * createRoom — Host creates a new room
     * Payload: { roomId, userName }
     */
    socket.on('createRoom', ({ roomId, userName }) => {
      const room = createRoom(roomId, socket.id, userName);
      socket.join(roomId);
      currentRoomId = roomId;
      currentUserName = userName;

      socket.emit('roomCreated', {
        roomId,
        participants: room.participants,
        playlist: room.playlist,
        isHost: true,
      });

      console.log(`[Room] Created: ${roomId} by ${userName}`);
    });

    /**
     * joinRoom — User joins an existing room
     * Payload: { roomId, userName }
     */
    socket.on('joinRoom', ({ roomId, userName }) => {
      const room = getRoom(roomId);

      if (!room) {
        socket.emit('error', { message: 'Room not found. Check your room ID.' });
        return;
      }

      const updatedRoom = addParticipant(roomId, socket.id, userName);
      socket.join(roomId);
      currentRoomId = roomId;
      currentUserName = userName;

      // Calculate precise live playback time for sync
      const liveTime = getLiveCurrentTime(updatedRoom);

      // Send full room state to the joining user
      socket.emit('roomJoined', {
        roomId,
        participants: updatedRoom.participants,
        playlist: updatedRoom.playlist,
        isHost: false,
        // Sync state: current song + exact timestamp
        sync: {
          currentSongIndex: updatedRoom.currentSongIndex,
          isPlaying: updatedRoom.isPlaying,
          currentTime: liveTime,
        },
      });

      // Notify all others in the room
      socket.to(roomId).emit('userJoined', {
        user: { id: socket.id, name: userName, isHost: false },
        participants: updatedRoom.participants,
      });

      console.log(`[Room] ${userName} joined: ${roomId} (sync time: ${liveTime.toFixed(2)}s)`);
    });

    // ─── MUSIC SYNC EVENTS ─────────────────────────────────────────────────────

    /**
     * play — Host plays / resumes music
     * Payload: { currentTime, songIndex }
     */
    socket.on('play', ({ currentTime, songIndex }) => {
      if (!currentRoomId || !isHost(currentRoomId, socket.id)) {
        socket.emit('permissionDenied', { action: 'play' });
        return;
      }
      updatePlayback(currentRoomId, { isPlaying: true, currentTime, currentSongIndex: songIndex });
      // Broadcast to everyone in room EXCEPT sender
      socket.to(currentRoomId).emit('play', { currentTime, songIndex });
      console.log(`[Music] Play in ${currentRoomId} at ${currentTime}s`);
    });

    /**
     * pause — Host pauses music
     * Payload: { currentTime }
     */
    socket.on('pause', ({ currentTime }) => {
      if (!currentRoomId || !isHost(currentRoomId, socket.id)) {
        socket.emit('permissionDenied', { action: 'pause' });
        return;
      }
      updatePlayback(currentRoomId, { isPlaying: false, currentTime });
      socket.to(currentRoomId).emit('pause', { currentTime });
      console.log(`[Music] Pause in ${currentRoomId} at ${currentTime}s`);
    });

    /**
     * seek — Host seeks to a position
     * Payload: { currentTime }
     */
    socket.on('seek', ({ currentTime }) => {
      if (!currentRoomId || !isHost(currentRoomId, socket.id)) {
        socket.emit('permissionDenied', { action: 'seek' });
        return;
      }
      const room = getRoom(currentRoomId);
      updatePlayback(currentRoomId, { currentTime, isPlaying: room?.isPlaying });
      socket.to(currentRoomId).emit('seek', { currentTime });
      console.log(`[Music] Seek in ${currentRoomId} to ${currentTime}s`);
    });

    /**
     * changeSong — Host changes the active song
     * Payload: { songIndex, currentTime }
     */
    socket.on('changeSong', ({ songIndex, currentTime = 0 }) => {
      if (!currentRoomId || !isHost(currentRoomId, socket.id)) {
        socket.emit('permissionDenied', { action: 'changeSong' });
        return;
      }
      updatePlayback(currentRoomId, { currentSongIndex: songIndex, currentTime, isPlaying: true });
      socket.to(currentRoomId).emit('changeSong', { songIndex, currentTime });
      console.log(`[Music] ChangeSong in ${currentRoomId} to index ${songIndex}`);
    });

    // ─── PLAYLIST EVENTS ────────────────────────────────────────────────────────

    /**
     * uploadSong — Any user can add a song to the playlist
     * Payload: { name, url, type, uploader, duration }
     * Note: In production, use a file hosting service (S3, Cloudinary) for the URL.
     *       For local demo, we pass a blob URL — it won't work across users.
     *       With proper file hosting the URL works globally.
     */
    socket.on('uploadSong', (song) => {
      if (!currentRoomId) return;
      const updatedRoom = addSong(currentRoomId, { ...song, uploadedAt: Date.now() });
      if (!updatedRoom) return;
      // Notify everyone in the room of the new song
      io.to(currentRoomId).emit('songAdded', {
        song,
        playlist: updatedRoom.playlist,
      });
      console.log(`[Playlist] Song added in ${currentRoomId}: ${song.name}`);
    });

    /**
     * removeSong — Host only can remove a song
     * Payload: { songIndex }
     */
    socket.on('removeSong', ({ songIndex }) => {
      if (!currentRoomId || !isHost(currentRoomId, socket.id)) {
        socket.emit('permissionDenied', { action: 'removeSong' });
        return;
      }
      const updatedRoom = removeSong(currentRoomId, songIndex);
      if (!updatedRoom) return;
      io.to(currentRoomId).emit('songRemoved', {
        songIndex,
        playlist: updatedRoom.playlist,
        currentSongIndex: updatedRoom.currentSongIndex,
      });
    });

    // ─── CHAT EVENTS ────────────────────────────────────────────────────────────

    /**
     * sendMessage — User sends a chat message
     * Payload: { text, userName }
     */
    socket.on('sendMessage', ({ text, userName }) => {
      if (!currentRoomId) return;
      const message = {
        id: Date.now(),
        text,
        userName,
        timestamp: new Date().toISOString(),
      };
      // Broadcast to everyone INCLUDING sender for consistent ordering
      io.to(currentRoomId).emit('receiveMessage', message);
    });

    // ─── ACTIVITY EVENTS ────────────────────────────────────────────────────────

    /**
     * activity — Broadcast an activity event to all users in room
     * Payload: { icon, text }
     */
    socket.on('activity', ({ icon, text }) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('activity', { icon, text, timestamp: new Date().toISOString() });
    });

    // ─── DISCONNECT ─────────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      if (!currentRoomId) return;

      const result = removeParticipant(currentRoomId, socket.id);

      if (!result) return;

      const { room, wasHost } = result;

      if (!room) {
        // Room is empty and deleted
        console.log(`[Room] ${currentRoomId} deleted (all users left)`);
        return;
      }

      // Notify remaining participants
      io.to(currentRoomId).emit('userLeft', {
        userId: socket.id,
        userName: currentUserName,
        participants: room.participants,
        newHostName: wasHost ? room.participants[0]?.name : null,
      });

      console.log(`[Room] ${currentUserName} left ${currentRoomId}`);
    });
  });
};