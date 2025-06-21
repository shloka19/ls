import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config/config.js';
import { initializeSupabase } from './config/supabase.js';
import { errorHandler, logger } from './middleware/middleware.js';
import disasterRoutes from './routes/disasters.js';
import socialMediaRoutes from './routes/socialMedia.js';
import resourceRoutes from './routes/resources.js';
import updatesRoutes from './routes/updates.js';
import verificationRoutes from './routes/verification.js';
import geocodingRoutes from './routes/geocoding.js';
import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { fileURLToPath } from 'url';

// Required for __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Initialize Supabase
const supabase = initializeSupabase();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter);

// Make io and supabase available to routes
app.use((req, res, next) => {
  req.io = io;
  req.supabase = supabase;
  next();
});

// Routes
app.use('/api/disasters', disasterRoutes);
app.use('/api/social-media', socialMediaRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/updates', updatesRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/geocoding', geocodingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve frontend
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handler
app.use(errorHandler);

// Socket.IO setup
io.on('connection', (socket) => {
  logger('info', `Socket connected: ${socket.id}`);

  socket.on('join_disaster', (disasterId) => {
    socket.join(`disaster_${disasterId}`);
    logger('info', `Socket ${socket.id} joined disaster_${disasterId}`);
  });

  socket.on('disconnect', () => {
    logger('info', `Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger('info', `Server running on port ${PORT}`);
});

export { io };
