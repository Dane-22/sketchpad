import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/env';
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import convertRoutes from './routes/convertRoutes';
import uploadRoutes from './routes/uploadRoutes';
import commentRoutes from './routes/commentRoutes';
import aiRoutes from './routes/aiRoutes';
import chatRoutes from './routes/chatRoutes';
import notificationRoutes from './routes/notificationRoutes';
import adminRoutes from './routes/adminRoutes';
import { errorHandler } from './middlewares/errorHandler';
import { initVapid } from './config/vapid';
import { setSocketServer } from './services/notificationService';

export const app = express();
const httpServer = createServer(app);

// Initialize Web Push VAPID
initVapid();

// Initialize Socket.io with high-performance configuration
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Adjust this for production
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e7, // 10MB buffer safety
  pingTimeout: 30000,
  pingInterval: 10000,
});

// Pass socket server instance to notification service
setSocketServer(io);

const CURSOR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e',
  '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#c026d3', '#e11d48',
  '#f87171', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#60a5fa', '#a78bfa', '#e879f9', '#fb7185',
  '#10b981', '#059669', '#34d399', '#14b8a6', '#0d9488', '#2dd4bf', '#6366f1', '#4f46e5', '#818cf8'
];
// Map projectId -> Map<socketId, color>
const roomColors = new Map<string, Map<string, string>>();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  const globalRoom = 'global-canvas';
  socket.join(globalRoom);

  // Allow client to join personal user notification room
  socket.on('identify-user', (userId: string) => {
    if (userId) {
      const userRoom = `user-${userId}`;
      socket.join(userRoom);
      console.log(`Socket ${socket.id} joined user room: ${userRoom}`);
    }
  });

  // Allow client to join a specific project room
  socket.on('join-project', (projectId: string) => {
    if (projectId) {
      const room = `project-${projectId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined ${room}`);
      
      if (!roomColors.has(projectId)) {
        roomColors.set(projectId, new Map());
      }
      const projectColors = roomColors.get(projectId)!;
      const usedColors = new Set(projectColors.values());
      const availableColor = CURSOR_COLORS.find(c => !usedColors.has(c)) || CURSOR_COLORS[0];
      projectColors.set(socket.id, availableColor);
      socket.emit('color-assigned', availableColor);
      
      socket.to(room).emit('user-joined', socket.id);
    }
  });

  socket.on('leave-project', (projectId: string) => {
    if (projectId) {
      const room = `project-${projectId}`;
      socket.leave(room);
      
      const projectColors = roomColors.get(projectId);
      if (projectColors) {
        projectColors.delete(socket.id);
      }
      
      console.log(`Socket ${socket.id} left ${room}`);
    }
  });

  // Channel rooms for messenger
  socket.on('join-channel', (channelId: string) => {
    socket.join(`channel-${channelId}`);
  });

  socket.on('leave-channel', (channelId: string) => {
    socket.leave(`channel-${channelId}`);
  });

  socket.on('send-channel-message', (data: { projectId: string; channelId: string; message: any }) => {
    if (data.channelId) {
      socket.to(`channel-${data.channelId}`).emit('channel-message-received', data);
    }
    if (data.projectId) {
      socket.to(`project-${data.projectId}`).emit('channel-message-received', data);
    }
  });

  socket.on('channel-created', (data: { projectId: string; channel: any }) => {
    if (data.projectId) {
      socket.to(`project-${data.projectId}`).emit('channel-created', data.channel);
    }
  });

  socket.on('channel-member-updated', (data: { projectId: string; channelId: string }) => {
    if (data.projectId) {
      socket.to(`project-${data.projectId}`).emit('channel-member-updated', data);
    }
  });

  // Handle entire elements array sync (scoped by project when available)
  socket.on('elements-changed', (data: any) => {
    const elements = Array.isArray(data) ? data : data?.elements;
    const projectId = !Array.isArray(data) ? data?.projectId : null;

    if (projectId) {
      socket.to(`project-${projectId}`).emit('elements-changed', elements);
    } else {
      socket.to(globalRoom).emit('elements-changed', elements);
    }
  });

  // Handle individual element added delta
  socket.on('element-added', (data: any) => {
    const element = data?.element || data;
    const projectId = data?.projectId;

    if (projectId) {
      socket.to(`project-${projectId}`).emit('element-added', element);
    } else {
      socket.to(globalRoom).emit('element-added', element);
    }
  });
  
  // Handle individual element updated delta
  socket.on('element-updated', (data: any) => {
    const projectId = data?.projectId;

    if (projectId) {
      socket.to(`project-${projectId}`).emit('element-updated', data);
    } else {
      socket.to(globalRoom).emit('element-updated', data);
    }
  });

  // Handle individual element removed delta
  socket.on('element-removed', (data: any) => {
    const id = typeof data === 'string' ? data : data?.id;
    const projectId = typeof data === 'object' ? data?.projectId : null;

    if (projectId) {
      socket.to(`project-${projectId}`).emit('element-removed', id);
    } else {
      socket.to(globalRoom).emit('element-removed', id);
    }
  });

  // Handle cursor movements (scoped by project)
  socket.on('cursor-moved', (data: any) => {
    const payload = { ...data, socketId: socket.id };
    if (data?.projectId) {
      socket.to(`project-${data.projectId}`).emit('cursor-moved', payload);
    } else {
      socket.to(globalRoom).emit('cursor-moved', payload);
    }
  });

  // Real-time Comments and Discussion events
  socket.on('new-comment', (data: { projectId: string; comment: any }) => {
    if (data.projectId) {
      socket.to(`project-${data.projectId}`).emit('new-comment', data.comment);
    }
    socket.to(globalRoom).emit('new-comment', data.comment);
  });

  socket.on('comment-reply-added', (data: { projectId: string; commentId: string; reply: any }) => {
    if (data.projectId) {
      socket.to(`project-${data.projectId}`).emit('comment-reply-added', data);
    }
    socket.to(globalRoom).emit('comment-reply-added', data);
  });

  socket.on('comment-resolved-updated', (data: { projectId: string; comment: any }) => {
    if (data.projectId) {
      socket.to(`project-${data.projectId}`).emit('comment-resolved-updated', data);
    }
    socket.to(globalRoom).emit('comment-resolved-updated', data);
  });

  socket.on('comment-deleted', (data: { projectId: string; commentId: string }) => {
    if (data.projectId) {
      socket.to(`project-${data.projectId}`).emit('comment-deleted', data.commentId);
    }
    socket.to(globalRoom).emit('comment-deleted', data.commentId);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    roomColors.forEach((colors, projectId) => {
      if (colors.has(socket.id)) {
        colors.delete(socket.id);
      }
    });

    socket.to(globalRoom).emit('user-disconnected', socket.id);
  });
});

// Security and utility middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Static File Serving for Uploads (e.g. /uploads/canvas/img_123.webp)
const uploadsDirectory = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDirectory, {
  maxAge: '7d',
  immutable: true,
}));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1', convertRoutes);
app.use('/api/v1', commentRoutes);
app.use('/api/v1', chatRoutes);


// Global Error Handler
app.use(errorHandler);

const PORT = config.port;

if (require.main === module) {
  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${config.nodeEnv} mode.`);
  });
}
