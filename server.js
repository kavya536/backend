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

// Socket.io Logic (Signaling for Video/Chat)
io.on('connection', (socket) => {
  console.log(`🔌 [SOCKET] New connection: ${socket.id}`);

  socket.on('join-room', ({ roomId, userId, userName }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userId = userId;

    const clients = io.sockets.adapter.rooms.get(roomId);
    const otherUsers = [];
    if (clients) {
      clients.forEach((clientId) => {
        if (clientId !== socket.id) {
          const clientSocket = io.sockets.sockets.get(clientId);
          otherUsers.push({ socketId: clientId, userId: clientSocket?.userId });
        }
      });
    }

    socket.emit('all-users', otherUsers);
    socket.to(roomId).emit('user-joined', { socketId: socket.id, userId, userName });
  });

  socket.on('signal', (data) => {
    io.to(data.to).emit('signal', { from: socket.id, signal: data.signal, userId: socket.userId });
  });

  socket.on('send-message', (data) => {
    io.to(data.roomId).emit('receive-message', data);
  });

  socket.on('disconnect', () => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('user-left', socket.id);
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
