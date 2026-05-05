const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const apiRoutes = require('./src/routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root Route
app.get('/', (req, res) => {
  res.status(200).send({
    message: "Welcome to Eduqra API",
    status: "online",
    endpoints: {
      ping: "/api/ping",
      routes: "/api/..."
    }
  });
});

// Health Check
app.get('/api/ping', (req, res) => res.status(200).send({ status: 'alive', time: new Date() }));

// MVC Routes
app.use('/api', apiRoutes);

// --- LIVE CLASS SYSTEM REGISTRY (Fixes Ghost Rooms) ---
const liveRooms = new Map(); // roomId -> Set of { socketId, userId, userName, role }

// Socket.io Logic (Signaling for Video/Chat)
io.on('connection', (socket) => {
  console.log(`🔌 [SOCKET] New connection: ${socket.id}`);

  socket.on('join-room', ({ roomId, userId, userName, role }) => {
    if (!roomId || !userId) return;

    socket.join(roomId);
    socket.roomId = roomId;
    socket.userId = userId;
    socket.userName = userName;
    socket.role = role || 'student';

    // Update Room Registry
    if (!liveRooms.has(roomId)) {
      liveRooms.set(roomId, new Map());
    }
    const roomParticipants = liveRooms.get(roomId);
    roomParticipants.set(socket.id, { 
      socketId: socket.id, 
      userId, 
      userName, 
      role: socket.role,
      joinedAt: new Date()
    });

    console.log(`🏠 [ROOM] ${userName} (${socket.role}) joined: ${roomId}. Total: ${roomParticipants.size}`);

    // Get list of other participants for WebRTC signaling
    const otherUsers = [];
    roomParticipants.forEach((user, sid) => {
      if (sid !== socket.id) {
        otherUsers.push(user);
      }
    });

    // 1. Send existing users to the newcomer
    socket.emit('all-users', otherUsers);

    // 2. Notify others in the room
    socket.to(roomId).emit('user-joined', { 
      socketId: socket.id, 
      userId, 
      userName, 
      role: socket.role 
    });
  });

  // WebRTC Signaling (Offer/Answer/ICE)
  socket.on('signal', (data) => {
    if (!data.to) return;
    io.to(data.to).emit('signal', { 
      from: socket.id, 
      signal: data.signal, 
      userId: socket.userId,
      userName: socket.userName
    });
  });

  // Real-time Media Sync (Mute/Camera Toggles)
  socket.on('toggle-media', (data) => {
    // data: { roomId, type: 'audio'|'video', enabled: bool }
    socket.to(data.roomId).emit('user-media-toggled', {
      socketId: socket.id,
      userId: socket.userId,
      ...data
    });
  });

  // Enhanced Chat System (Broadcast & Private)
  socket.on('send-message', (data) => {
    // data: { roomId, text, senderId, senderName, senderRole, toSocketId (optional) }
    if (data.toSocketId) {
      // Private Message
      io.to(data.toSocketId).emit('receive-message', { ...data, isPrivate: true });
      socket.emit('receive-message', { ...data, isPrivate: true }); // Echo to sender
    } else {
      // Broadcast to Room
      io.to(data.roomId).emit('receive-message', data);
    }
  });

  socket.on('disconnect', () => {
    if (socket.roomId && liveRooms.has(socket.roomId)) {
      const roomParticipants = liveRooms.get(socket.roomId);
      roomParticipants.delete(socket.id);
      
      console.log(`🏃 [ROOM] ${socket.userName} left: ${socket.roomId}. Remaining: ${roomParticipants.size}`);
      
      socket.to(socket.roomId).emit('user-left', {
        socketId: socket.id,
        userId: socket.userId
      });

      // Cleanup empty rooms
      if (roomParticipants.size === 0) {
        liveRooms.delete(socket.roomId);
        console.log(`🧹 [ROOM] Cleaned up empty room: ${socket.roomId}`);
      }
    }
  });
});

// Only listen if NOT running on Vercel
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`🚀 [MVC] Server running on port ${PORT}`);
  });
}

// Required for Vercel Serverless Functions
module.exports = app;

// Required for Firebase Cloud Functions
try {
  const { onRequest } = require("firebase-functions/v2/https");
  exports.api = onRequest({ region: "us-central1", memory: "1GiB" }, app);
} catch (e) {
  console.warn("⚠️ Firebase Functions module not loaded (running in standalone mode)");
}
