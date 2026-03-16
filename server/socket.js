// server/socket.js — All Socket.IO event handlers (NO HOST RESTRICTIONS)

const {
  createRoom,
  getRoom,
  addParticipant,
  removeParticipant,
  addSong,
  removeSong,
  updatePlayback,
  getLiveCurrentTime,
} = require('./roomManager');

module.exports = function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    let currentRoomId = null;
    let currentUserName = null;

    // ─── ROOM EVENTS ───────────────────────────────────────────────────────────

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

      const liveTime = getLiveCurrentTime(updatedRoom);

      socket.emit('roomJoined', {
        roomId,
        participants: updatedRoom.participants,
        playlist: updatedRoom.playlist,
        isHost: false,
        sync: {
          currentSongIndex: updatedRoom.currentSongIndex,
          isPlaying: updatedRoom.isPlaying,
          currentTime: liveTime,
        },
      });

      socket.to(roomId).emit('userJoined', {
        user: { id: socket.id, name: userName, isHost: false },
        participants: updatedRoom.participants,
      });

      console.log(`[Room] ${userName} joined: ${roomId} (sync time: ${liveTime.toFixed(2)}s)`);
    });

    // ─── MUSIC SYNC EVENTS ─────────────────────────────────────────────────────

    socket.on('play', ({ currentTime, songIndex }) => {
      if (!currentRoomId) return;
      updatePlayback(currentRoomId, { isPlaying: true, currentTime, currentSongIndex: songIndex });
      socket.to(currentRoomId).emit('play', { currentTime, songIndex });
      console.log(`[Music] Play in ${currentRoomId} at ${currentTime}s by ${currentUserName}`);
    });

    socket.on('pause', ({ currentTime }) => {
      if (!currentRoomId) return;
      updatePlayback(currentRoomId, { isPlaying: false, currentTime });
      socket.to(currentRoomId).emit('pause', { currentTime });
      console.log(`[Music] Pause in ${currentRoomId} at ${currentTime}s by ${currentUserName}`);
    });

    socket.on('seek', ({ currentTime }) => {
      if (!currentRoomId) return;
      const room = getRoom(currentRoomId);
      updatePlayback(currentRoomId, { currentTime, isPlaying: room?.isPlaying });
      socket.to(currentRoomId).emit('seek', { currentTime });
      console.log(`[Music] Seek in ${currentRoomId} to ${currentTime}s by ${currentUserName}`);
    });

    socket.on('changeSong', ({ songIndex, currentTime = 0 }) => {
      if (!currentRoomId) return;
      updatePlayback(currentRoomId, { currentSongIndex: songIndex, currentTime, isPlaying: true });
      socket.to(currentRoomId).emit('changeSong', { songIndex, currentTime });
      console.log(`[Music] ChangeSong in ${currentRoomId} to index ${songIndex} by ${currentUserName}`);
    });

    // ─── PLAYLIST EVENTS ────────────────────────────────────────────────────────

    socket.on('uploadSong', (song) => {
      if (!currentRoomId) return;
      const updatedRoom = addSong(currentRoomId, { ...song, uploadedAt: Date.now() });
      if (!updatedRoom) return;
      io.to(currentRoomId).emit('songAdded', {
        song,
        playlist: updatedRoom.playlist,
      });
      console.log(`[Playlist] Song added in ${currentRoomId}: ${song.name} by ${currentUserName}`);
    });

    socket.on('removeSong', ({ songIndex }) => {
      if (!currentRoomId) return;
      const updatedRoom = removeSong(currentRoomId, songIndex);
      if (!updatedRoom) return;
      io.to(currentRoomId).emit('songRemoved', {
        songIndex,
        playlist: updatedRoom.playlist,
        currentSongIndex: updatedRoom.currentSongIndex,
      });
      console.log(`[Playlist] Song removed in ${currentRoomId} at index ${songIndex} by ${currentUserName}`);
    });

    // ─── CHAT EVENTS ────────────────────────────────────────────────────────────

    socket.on('sendMessage', ({ text, userName }) => {
      if (!currentRoomId) return;
      const message = {
        id: Date.now(),
        text,
        userName,
        timestamp: new Date().toISOString(),
      };
      io.to(currentRoomId).emit('receiveMessage', message);
    });

    // ─── ACTIVITY EVENTS ────────────────────────────────────────────────────────

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
        console.log(`[Room] ${currentRoomId} deleted (all users left)`);
        return;
      }

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