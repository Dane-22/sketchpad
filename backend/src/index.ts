import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/env';
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import convertRoutes from './routes/convertRoutes';
import commentRoutes from './routes/commentRoutes';
import aiRoutes from './routes/aiRoutes';
import chatRoutes from './routes/chatRoutes';
import { errorHandler } from './middlewares/errorHandler';

export const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Adjust this for production
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  const globalRoom = 'global-canvas';
  socket.join(globalRoom);

  // Allow client to join a specific project room
  socket.on('join-project', (projectId: string) => {
    const room = `project-${projectId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined ${room}`);
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

  // Handle entire elements array sync (for initial sync or bulk changes)
  socket.on('elements-changed', (data) => {
    socket.to(globalRoom).emit('elements-changed', data);
  });

  // Handle individual element changes
  socket.on('element-added', (data) => {
    socket.to(globalRoom).emit('element-added', data);
  });
  
  socket.on('element-updated', (data) => {
    socket.to(globalRoom).emit('element-updated', data);
  });

  socket.on('element-removed', (data) => {
    socket.to(globalRoom).emit('element-removed', data);
  });

  socket.on('cursor-moved', (data) => {
    socket.to(globalRoom).emit('cursor-moved', { ...data, socketId: socket.id });
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
    socket.to(globalRoom).emit('user-disconnected', socket.id);
  });
});

// Security and utility middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(express.json({ limit: '5gb' }));
app.use(express.urlencoded({ limit: '5gb', extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1', convertRoutes);
app.use('/api/v1', commentRoutes);
app.use('/api/v1', chatRoutes);
app.use('/api/v1/ai', aiRoutes);


// Global Error Handler
app.use(errorHandler);

const PORT = config.port;

if (require.main === module) {
  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${config.nodeEnv} mode.`);
  });
}
