// roomManager.js — Manages all rooms and their state in memory

const rooms = new Map();

/**
 * Create a new room
 */
function createRoom(roomId, hostId, hostName) {
  const room = {
    id: roomId,
    hostId,
    participants: [{ id: hostId, name: hostName, isHost: true, joinedAt: Date.now() }],
    playlist: [],
    currentSongIndex: -1,
    isPlaying: false,
    currentTime: 0,
    lastTimeUpdate: Date.now(), // track when currentTime was last set (for sync math)
  };
  rooms.set(roomId, room);
  return room;
}

/**
 * Get room by ID
 */
function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

/**
 * Add a participant to an existing room
 */
function addParticipant(roomId, userId, userName) {
  const room = rooms.get(roomId);
  if (!room) return null;
  // Prevent duplicate join
  if (!room.participants.find(p => p.id === userId)) {
    room.participants.push({ id: userId, name: userName, isHost: false, joinedAt: Date.now() });
  }
  return room;
}

/**
 * Remove a participant from a room
 * Returns { room, wasHost } for caller to decide if host transfer needed
 */
function removeParticipant(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  const wasHost = room.hostId === userId;
  room.participants = room.participants.filter(p => p.id !== userId);

  if (room.participants.length === 0) {
    // Delete empty rooms to free memory
    rooms.delete(roomId);
    return { room: null, wasHost };
  }

  // Transfer host to next participant
  if (wasHost) {
    const newHost = room.participants[0];
    newHost.isHost = true;
    room.hostId = newHost.id;
  }

  return { room, wasHost };
}

/**
 * Add a song to the room playlist
 */
function addSong(roomId, song) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.playlist.push(song);
  return room;
}

/**
 * Remove a song from the room playlist (host only)
 */
function removeSong(roomId, songIndex) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.playlist.splice(songIndex, 1);
  // Adjust currentSongIndex
  if (room.currentSongIndex === songIndex) {
    room.isPlaying = false;
    room.currentSongIndex = room.playlist.length > 0
      ? Math.min(songIndex, room.playlist.length - 1)
      : -1;
  } else if (room.currentSongIndex > songIndex) {
    room.currentSongIndex--;
  }
  return room;
}

/**
 * Update playback state
 */
function updatePlayback(roomId, { isPlaying, currentTime, currentSongIndex }) {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (isPlaying !== undefined) room.isPlaying = isPlaying;
  if (currentTime !== undefined) {
    room.currentTime = currentTime;
    room.lastTimeUpdate = Date.now();
  }
  if (currentSongIndex !== undefined) room.currentSongIndex = currentSongIndex;
  return room;
}

/**
 * Get the "live" current time accounting for elapsed time since last update
 * This is used for joining users to sync precisely
 */
function getLiveCurrentTime(room) {
  if (!room.isPlaying) return room.currentTime;
  const elapsed = (Date.now() - room.lastTimeUpdate) / 1000;
  return room.currentTime + elapsed;
}

/**
 * Check if a socket ID is the host of a room
 */
function isHost(roomId, userId) {
  const room = rooms.get(roomId);
  return room ? room.hostId === userId : false;
}

module.exports = {
  createRoom,
  getRoom,
  addParticipant,
  removeParticipant,
  addSong,
  removeSong,
  updatePlayback,
  getLiveCurrentTime,
  isHost,
};