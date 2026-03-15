require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const store = require('./data/store');
const { verifyToken, SECRET } = require('./middleware/auth');

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Ensure local uploads directory exists (fallback)
const uploadsDir = path.join(__dirname, 'uploads');
if (!require('fs').existsSync(uploadsDir)) {
  require('fs').mkdirSync(uploadsDir, { recursive: true });
}

// Use Cloudinary if configured, otherwise local disk
const useCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);

const cloudinaryStorage = useCloudinary ? new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'student-platform',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'pdf', 'doc', 'docx', 'txt'],
    resource_type: 'auto'
  }
}) : null;

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const chatUpload = multer({
  storage: useCloudinary ? cloudinaryStorage : localStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(new Error('Видео файлы не разрешены'), false);
    } else {
      cb(null, true);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', credentials: true }
});

// Trust proxy (for Render/Heroku HTTPS)
app.set('trust proxy', 1);

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(verifyToken);

// Static files
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/communities', require('./routes/communities'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/events', require('./routes/events'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/search', require('./routes/search'));

// Chat file upload endpoint
app.post('/api/upload', (req, res) => {
  chatUpload.array('files', 10)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Файл слишком большой (макс. 50MB)' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Нет файлов' });
    const uploaded = req.files.map(f => ({
      filename: f.filename,
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      url: useCloudinary ? f.path : '/uploads/' + f.filename
    }));
    res.json(uploaded);
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Socket.io
const onlineUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token ||
    socket.handshake.headers?.cookie?.split('token=')[1]?.split(';')[0];
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET);
      socket.user = decoded;
    } catch (e) {
      socket.user = null;
    }
  }
  next();
});

io.on('connection', (socket) => {
  if (socket.user) {
    onlineUsers.set(socket.user.id, socket.id);
    store.update('users', socket.user.id, { is_online: true });
    io.emit('user:online', { userId: socket.user.id });
  }

  // Personal message
  socket.on('message:send', (data) => {
    if (!socket.user) return;
    try {
      const msg = store.insert('messages', {
        sender_id: socket.user.id,
        receiver_id: data.receiverId,
        community_id: null,
        text: data.text,
        image: data.image || null,
        is_read: false
      });
      msg.sender_name = socket.user.name;
      msg.sender_avatar = socket.user.avatar;

      // Create notification for receiver
      const notif = store.insert('notifications', {
        user_id: data.receiverId,
        type: 'message',
        text: `${socket.user.name} отправил(а) вам сообщение`,
        sender_id: socket.user.id,
        is_read: false
      });

      const receiverSocket = onlineUsers.get(data.receiverId);
      if (receiverSocket) {
        io.to(receiverSocket).emit('message:receive', msg);
        io.to(receiverSocket).emit('notification:new', notif);
      }
      socket.emit('message:sent', msg);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // Community chat message
  socket.on('community:message', (data) => {
    if (!socket.user) return;
    try {
      const msg = store.insert('messages', {
        sender_id: socket.user.id,
        receiver_id: null,
        community_id: data.communityId,
        text: data.text,
        image: data.image || null,
        is_read: false
      });
      msg.sender_name = socket.user.name;
      msg.sender_avatar = socket.user.avatar;
      io.to(`community:${data.communityId}`).emit('community:message', msg);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // Join community room
  socket.on('community:join', (communityId) => {
    socket.join(`community:${communityId}`);
  });

  socket.on('community:leave', (communityId) => {
    socket.leave(`community:${communityId}`);
  });

  // Typing indicator
  socket.on('typing:start', (data) => {
    if (data.receiverId) {
      const receiverSocket = onlineUsers.get(data.receiverId);
      if (receiverSocket) {
        io.to(receiverSocket).emit('typing:start', { userId: socket.user?.id });
      }
    } else if (data.communityId) {
      socket.to(`community:${data.communityId}`).emit('typing:start', {
        userId: socket.user?.id, name: socket.user?.name
      });
    }
  });

  socket.on('typing:stop', (data) => {
    if (data.receiverId) {
      const receiverSocket = onlineUsers.get(data.receiverId);
      if (receiverSocket) {
        io.to(receiverSocket).emit('typing:stop', { userId: socket.user?.id });
      }
    } else if (data.communityId) {
      socket.to(`community:${data.communityId}`).emit('typing:stop', { userId: socket.user?.id });
    }
  });

  socket.on('disconnect', () => {
    if (socket.user) {
      onlineUsers.delete(socket.user.id);
      store.update('users', socket.user.id, { is_online: false });
      io.emit('user:offline', { userId: socket.user.id });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
