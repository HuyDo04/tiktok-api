
const { getStreamById, endStream } = require('../services/stream.service');

// This object will hold our active livestream rooms and their state
const liveStreams = {};

module.exports = (io, socket) => {
  // HOST: Starts a livestream room
  const hostStream = async ({ streamId, peerId }) => {
    try {
      console.log(`[Host] Host ${socket.user.username} is starting stream ${streamId}`);
      const stream = await getStreamById(streamId);
      if (!stream || stream.hostId !== socket.user.id) {
        // Handle error: stream not found or user is not the host
        return;
      }

      const roomId = stream.roomId;
      liveStreams[roomId] = {
        host: { id: socket.user.id, peerId },
        viewers: {},
        // Mediasoup router/producer info would go here
      };

      socket.join(roomId);
      console.log(`[Socket] User ${socket.user.username} created and joined room ${roomId}`);

      // Notify host that they are ready
      socket.emit('livestream:host-ready', { roomId });
    } catch (error) {
      console.error('Error hosting stream:', error);
    }
  };

  // VIEWER: Joins a livestream room
  const joinStream = async ({ roomId, peerId }) => {
    console.log(`[Viewer] User ${socket.user.username} with peerId ${peerId} is joining room ${roomId}`);

    const room = liveStreams[roomId];
    if (!room) {
      console.log(`[Error] Room ${roomId} does not exist.`);
      // Handle error: room not found
      return;
    }

    socket.join(roomId);
    room.viewers[socket.user.id] = { peerId };

    // Notify the host about the new viewer
    io.to(room.host.id).emit('livestream:viewer-joined', {
      viewerId: socket.user.id,
      viewerPeerId: peerId,
    });

    // Send host peerId to the new viewer so they can connect
    socket.emit('livestream:host-info', { hostPeerId: room.host.peerId });

    console.log(`[Socket] User ${socket.user.username} joined room ${roomId}`);
    io.to(roomId).emit('livestream:viewer-count', Object.keys(room.viewers).length);
  };

  // HOST: Ends the livestream
  const endLiveStream = async ({ roomId }) => {
    console.log(`[Host] Host ${socket.user.username} is ending stream in room ${roomId}`);
    const room = liveStreams[roomId];

    if (room && room.host.id === socket.user.id) {
      try {
        // Update status in DB
        await endStream(roomId, socket.user.id);

        // Notify all viewers that the stream has ended
        io.to(roomId).emit('livestream:stream-ended');

        // Clean up the room
        delete liveStreams[roomId];
      } catch (error) {
        console.error('Error ending stream:', error);
      }
    }
  };

  // Handle user disconnecting
  const onDisconnect = () => {
    // Find which room the user was in and handle their departure
    for (const roomId in liveStreams) {
      const room = liveStreams[roomId];

      // If the host disconnects, end the stream for everyone
      if (room.host.id === socket.user.id) {
        console.log(`[Host Disconnected] Host ${socket.user.username} disconnected. Ending stream ${roomId}`);
        endLiveStream({ roomId });
        break;
      }

      // If a viewer disconnects, remove them and notify the host
      if (room.viewers[socket.user.id]) {
        console.log(`[Viewer Disconnected] Viewer ${socket.user.username} left room ${roomId}`);
        delete room.viewers[socket.user.id];
        io.to(room.host.id).emit('livestream:viewer-left', { viewerId: socket.user.id });
        io.to(roomId).emit('livestream:viewer-count', Object.keys(room.viewers).length);
        break;
      }
    }
  };

  // Registering events
  socket.on('livestream:host', hostStream);
  socket.on('livestream:join', joinStream);
  socket.on('livestream:end', endLiveStream);
  socket.on('disconnect', onDisconnect);

  // --- WebRTC Signaling Events ---
  // These events just pass through data between peers

  socket.on('webrtc:offer', (data) => {
    io.to(data.to).emit('webrtc:offer', { from: socket.user.id, offer: data.offer });
  });

  socket.on('webrtc:answer', (data) => {
    io.to(data.to).emit('webrtc:answer', { from: socket.user.id, answer: data.answer });
  });

  socket.on('webrtc:ice-candidate', (data) => {
    io.to(data.to).emit('webrtc:ice-candidate', { from: socket.user.id, candidate: data.candidate });
  });
};
